import { describe, expect, it, vi } from 'vitest';
import { buildPhotonLabel, mapPhotonFeature, normalizePhotonLang } from './photon';
import { mapNominatimResponse } from './nominatim';
import { mapJourney } from './transitRest';
import { createRateLimiter } from './rateLimit';

describe('photon', () => {
  it('compone la etiqueta con calle, código postal, ciudad y país', () => {
    expect(
      buildPhotonLabel({
        name: 'Universität Potsdam',
        street: 'Am Neuen Palais',
        housenumber: '10',
        postcode: '14469',
        city: 'Potsdam',
        country: 'Alemania',
      }),
    ).toBe('Universität Potsdam, Am Neuen Palais 10, 14469 Potsdam, Alemania');
  });

  it('no repite la calle cuando ya es el nombre', () => {
    expect(buildPhotonLabel({ street: 'Hauptstraße', housenumber: '5', city: 'Potsdam' })).toBe(
      'Hauptstraße 5, Potsdam',
    );
  });

  it('convierte [lng, lat] de GeoJSON a {lat, lng}', () => {
    const result = mapPhotonFeature(
      {
        geometry: { coordinates: [13.0645, 52.3906] },
        properties: { name: 'Potsdam', osm_id: 62369, osm_type: 'R', country: 'Alemania' },
      },
      0,
    );
    expect(result?.position).toEqual({ lat: 52.3906, lng: 13.0645 });
    expect(result?.id).toBe('R62369');
  });

  it('sólo envía idiomas que Photon admite (con otro responde 400)', () => {
    expect(normalizePhotonLang('de')).toBe('de');
    expect(normalizePhotonLang('en')).toBe('en');
    // La UI está en español, pero Photon no lo admite.
    expect(normalizePhotonLang('es')).toBe('default');
    expect(normalizePhotonLang('pt-BR')).toBe('default');
  });

  it('descarta features sin geometría o sin etiqueta', () => {
    expect(mapPhotonFeature({ properties: { name: 'X' } }, 0)).toBeNull();
    expect(mapPhotonFeature({ geometry: { coordinates: [1, 2] }, properties: {} }, 0)).toBeNull();
  });
});

describe('nominatim', () => {
  it('normaliza la respuesta del reverse', () => {
    const result = mapNominatimResponse(
      {
        osm_id: 123,
        osm_type: 'way',
        display_name: 'Am Neuen Palais 10, Potsdam, Alemania',
        lat: '52.3906',
        lon: '13.0645',
        address: { city: 'Potsdam', country: 'Alemania', postcode: '14469' },
      },
      { lat: 0, lng: 0 },
    );
    expect(result?.label).toContain('Am Neuen Palais');
    expect(result?.position.lat).toBeCloseTo(52.3906, 4);
    expect(result?.city).toBe('Potsdam');
  });

  it('usa town o village cuando no hay city', () => {
    const result = mapNominatimResponse(
      { display_name: 'Un pueblo', address: { town: 'Werder' } },
      { lat: 52.4, lng: 12.9 },
    );
    expect(result?.city).toBe('Werder');
  });

  it('cae a la posición pedida si la respuesta no trae coordenadas', () => {
    const fallback = { lat: 52.4, lng: 12.9 };
    expect(mapNominatimResponse({ display_name: 'X' }, fallback)?.position).toEqual(fallback);
  });

  it('devuelve null ante un error del servicio', () => {
    expect(mapNominatimResponse({ error: 'Unable to geocode' }, { lat: 0, lng: 0 })).toBeNull();
  });
});

describe('transporte público', () => {
  it('mide de la salida del primer tramo a la llegada del último', () => {
    const result = mapJourney({
      legs: [
        { departure: '2026-09-28T08:00:00Z', arrival: '2026-09-28T08:06:00Z', walking: true },
        { departure: '2026-09-28T08:06:00Z', arrival: '2026-09-28T08:28:00Z' },
      ],
    });
    expect(result?.durationMin).toBe(28);
    expect(result?.mode).toBe('transit');
    expect(result?.estimated).toBe(false);
  });

  it('no cuenta los tramos a pie como transbordos', () => {
    const result = mapJourney({
      legs: [
        { departure: '2026-09-28T08:00:00Z', arrival: '2026-09-28T08:05:00Z', walking: true },
        { departure: '2026-09-28T08:05:00Z', arrival: '2026-09-28T08:20:00Z' },
        { departure: '2026-09-28T08:22:00Z', arrival: '2026-09-28T08:35:00Z' },
        { departure: '2026-09-28T08:35:00Z', arrival: '2026-09-28T08:40:00Z', walking: true },
      ],
    });
    expect(result?.transfers).toBe(1);
    expect(result?.durationMin).toBe(40);
  });

  it('usa los horarios planificados si no hay tiempo real', () => {
    const result = mapJourney({
      legs: [
        {
          plannedDeparture: '2026-09-28T08:00:00Z',
          plannedArrival: '2026-09-28T08:30:00Z',
        },
      ],
    });
    expect(result?.durationMin).toBe(30);
  });

  it('descarta viajes sin tramos o con horas inservibles', () => {
    expect(mapJourney({ legs: [] })).toBeNull();
    expect(mapJourney({ legs: [{ departure: 'no-es-fecha' }] })).toBeNull();
  });
});

describe('createRateLimiter', () => {
  it('serializa las tareas respetando el intervalo mínimo', async () => {
    vi.useFakeTimers();
    try {
      const limiter = createRateLimiter(1000);
      const starts: number[] = [];
      const task = () => {
        starts.push(Date.now());
        return Promise.resolve('ok');
      };

      const all = Promise.all([limiter(task), limiter(task), limiter(task)]);
      await vi.advanceTimersByTimeAsync(3000);
      await all;

      expect(starts).toHaveLength(3);
      expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(1000);
      expect(starts[2]! - starts[1]!).toBeGreaterThanOrEqual(1000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('una tarea que falla no bloquea la cola', async () => {
    const limiter = createRateLimiter(0);
    await expect(limiter(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(limiter(() => Promise.resolve('sigue'))).resolves.toBe('sigue');
  });
});
