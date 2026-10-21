import { describe, expect, it } from 'vitest';
import { parseLocationInput } from './parseLocationInput';

const expectPosition = (input: string, lat: number, lng: number) => {
  const result = parseLocationInput(input);
  expect(result.ok, `no parseó: ${input}`).toBe(true);
  if (result.ok) {
    expect(result.position.lat).toBeCloseTo(lat, 4);
    expect(result.position.lng).toBeCloseTo(lng, 4);
  }
};

describe('coordenadas sueltas', () => {
  it('acepta el formato de la spec', () => {
    expectPosition('52.3906, 13.0645', 52.3906, 13.0645);
  });

  it('tolera espacios, punto y coma y sin espacio', () => {
    expectPosition('52.3906,13.0645', 52.3906, 13.0645);
    expectPosition('  52.3906 ; 13.0645 ', 52.3906, 13.0645);
    expectPosition('52.3906 13.0645', 52.3906, 13.0645);
  });

  it('acepta negativos', () => {
    expectPosition('-33.4489, -70.6693', -33.4489, -70.6693);
  });

  it('entiende la coma decimal cuando no es ambiguo', () => {
    expectPosition('52,3906, 13,0645', 52.3906, 13.0645);
  });

  it('acepta geo: URIs', () => {
    expectPosition('geo:52.3906,13.0645', 52.3906, 13.0645);
  });
});

describe('links de Google Maps', () => {
  it('lee @lat,lng', () => {
    expectPosition(
      'https://www.google.com/maps/place/Potsdam/@52.3906,13.0645,15z/data=!3m1',
      52.3906,
      13.0645,
    );
  });

  it('lee ?q= y ?query=', () => {
    expectPosition('https://www.google.com/maps?q=52.3906,13.0645', 52.3906, 13.0645);
    expectPosition(
      'https://www.google.com/maps/search/?api=1&query=52.3906%2C13.0645',
      52.3906,
      13.0645,
    );
  });

  it('lee el par !3d!4d del final de la URL', () => {
    expectPosition(
      'https://www.google.com/maps/place/X/data=!4m2!3m1!1s0x0!3d52.3906!4d13.0645',
      52.3906,
      13.0645,
    );
  });

  it('explica por qué no puede con los links cortos', () => {
    const result = parseLocationInput('https://maps.app.goo.gl/AbCdEfGh');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('short-link');
      expect(result.message).toContain('copia las coordenadas');
    }
  });
});

describe('links de OpenStreetMap', () => {
  it('lee #map=zoom/lat/lng', () => {
    expectPosition('https://www.openstreetmap.org/#map=15/52.3906/13.0645', 52.3906, 13.0645);
  });

  it('lee mlat/mlon', () => {
    expectPosition(
      'https://www.openstreetmap.org/?mlat=52.3906&mlon=13.0645#map=17/52.39/13.06',
      52.3906,
      13.0645,
    );
  });
});

describe('entradas inválidas', () => {
  it('rechaza el vacío', () => {
    const result = parseLocationInput('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('empty');
  });

  it('rechaza coordenadas fuera de rango', () => {
    const result = parseLocationInput('95.0, 13.0645');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('out-of-range');
  });

  it('rechaza texto que no es una ubicación', () => {
    for (const input of ['Potsdam', 'https://example.com/algo', 'hola mundo']) {
      const result = parseLocationInput(input);
      expect(result.ok, input).toBe(false);
      if (!result.ok) expect(result.reason).toBe('unrecognized');
    }
  });
});
