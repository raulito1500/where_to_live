import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlaceCategory } from '@/types';
import {
  buildOverpassQuery,
  createOverpassProvider,
  groupByCategory,
  matchesCategory,
  matchesFilter,
  parseOsmFilter,
} from './overpass';

const origin = { lat: 52.3906, lng: 13.0645 };

const category = (overrides: Partial<PlaceCategory> & { id: string }): PlaceCategory => ({
  label: overrides.id,
  icon: 'MapPin',
  enabled: true,
  kind: 'nearest',
  radiusM: 2000,
  osmFilters: ['["shop"="supermarket"]'],
  scoring: { weight: 3, idealMin: 5, maxMin: 20 },
  scoringMode: 'foot',
  ...overrides,
});

describe('parseOsmFilter', () => {
  it('lee un filtro simple', () => {
    expect(parseOsmFilter('["shop"="supermarket"]')).toEqual([
      { key: 'shop', op: '=', value: 'supermarket' },
    ]);
  });

  it('lee varias condiciones encadenadas, incluida la negación', () => {
    expect(parseOsmFilter('["leisure"="swimming_pool"]["access"!="private"]')).toEqual([
      { key: 'leisure', op: '=', value: 'swimming_pool' },
      { key: 'access', op: '!=', value: 'private' },
    ]);
  });

  it('devuelve vacío ante basura', () => {
    expect(parseOsmFilter('shop=supermarket')).toEqual([]);
  });
});

describe('matchesFilter', () => {
  it('exige que se cumplan TODAS las condiciones', () => {
    const conditions = parseOsmFilter('["leisure"="swimming_pool"]["access"!="private"]');
    expect(matchesFilter({ leisure: 'swimming_pool' }, conditions)).toBe(true);
    expect(matchesFilter({ leisure: 'swimming_pool', access: 'yes' }, conditions)).toBe(true);
    expect(matchesFilter({ leisure: 'swimming_pool', access: 'private' }, conditions)).toBe(false);
    expect(matchesFilter({ leisure: 'park' }, conditions)).toBe(false);
  });

  it('sin condiciones no acepta nada', () => {
    expect(matchesFilter({ shop: 'supermarket' }, [])).toBe(false);
  });
});

describe('matchesCategory', () => {
  it('acepta si encaja CUALQUIERA de los filtros', () => {
    const station = category({
      id: 'train',
      osmFilters: ['["railway"="station"]', '["railway"="halt"]'],
    });
    expect(matchesCategory({ railway: 'station' }, station)).toBe(true);
    expect(matchesCategory({ railway: 'halt' }, station)).toBe(true);
    expect(matchesCategory({ railway: 'tram_stop' }, station)).toBe(false);
  });
});

describe('buildOverpassQuery', () => {
  it('genera un bloque por filtro con el radio de su categoría', () => {
    const query = buildOverpassQuery(origin, [
      category({ id: 'supermarket', radiusM: 2000 }),
      category({ id: 'park', radiusM: 2500, osmFilters: ['["leisure"="park"]'] }),
    ]);

    expect(query).toContain('[out:json][timeout:25]');
    expect(query).toContain('nwr(around:2000,52.3906,13.0645)["shop"="supermarket"];');
    expect(query).toContain('nwr(around:2500,52.3906,13.0645)["leisure"="park"];');
    expect(query.trim().endsWith('out center tags;')).toBe(true);
  });

  it('una categoría con varios filtros genera varias líneas', () => {
    const query = buildOverpassQuery(origin, [
      category({ id: 'train', osmFilters: ['["railway"="station"]', '["railway"="halt"]'] }),
    ]);
    expect(query.split('\n').filter((line) => line.includes('nwr('))).toHaveLength(2);
  });
});

describe('groupByCategory', () => {
  const supermarket = category({ id: 'supermarket', radiusM: 2000 });
  const park = category({ id: 'park', radiusM: 2500, osmFilters: ['["leisure"="park"]'] });

  it('reparte los elementos y ordena por distancia', () => {
    const grouped = groupByCategory(
      origin,
      [
        { type: 'node', id: 2, lat: 52.4, lon: 13.07, tags: { shop: 'supermarket', name: 'Lejos' } },
        { type: 'node', id: 1, lat: 52.3910, lon: 13.0650, tags: { shop: 'supermarket', name: 'Cerca' } },
        { type: 'way', id: 3, center: { lat: 52.3950, lon: 13.06 }, tags: { leisure: 'park', name: 'Parque' } },
      ],
      [supermarket, park],
    );

    expect(grouped.supermarket?.map((place) => place.name)).toEqual(['Cerca', 'Lejos']);
    expect(grouped.park).toHaveLength(1);
    expect(grouped.park?.[0]?.osmId).toBe('way3');
  });

  it('usa `center` en ways y relations', () => {
    const grouped = groupByCategory(
      origin,
      [{ type: 'way', id: 9, center: { lat: 52.3907, lon: 13.0646 }, tags: { shop: 'supermarket' } }],
      [supermarket],
    );
    expect(grouped.supermarket?.[0]?.position).toEqual({ lat: 52.3907, lng: 13.0646 });
  });

  it('descarta lo que cae fuera del radio de la categoría', () => {
    // A ~11 km: dentro de la consulta de otra categoría, fuera de esta.
    const grouped = groupByCategory(
      origin,
      [{ type: 'node', id: 1, lat: 52.49, lon: 13.0645, tags: { shop: 'supermarket' } }],
      [supermarket],
    );
    expect(grouped.supermarket).toHaveLength(0);
  });

  it('no repite el mismo elemento dentro de una categoría', () => {
    const element = { type: 'node', id: 1, lat: 52.3907, lon: 13.0646, tags: { shop: 'supermarket' } };
    const grouped = groupByCategory(origin, [element, element], [supermarket]);
    expect(grouped.supermarket).toHaveLength(1);
  });

  it('un elemento puede pertenecer a varias categorías', () => {
    const health = category({
      id: 'health',
      radiusM: 4000,
      osmFilters: ['["amenity"="hospital"]'],
    });
    const pharmacy = category({
      id: 'pharmacy',
      radiusM: 2000,
      osmFilters: ['["amenity"="hospital"]'],
    });
    const grouped = groupByCategory(
      origin,
      [{ type: 'node', id: 1, lat: 52.3907, lon: 13.0646, tags: { amenity: 'hospital' } }],
      [health, pharmacy],
    );
    expect(grouped.health).toHaveLength(1);
    expect(grouped.pharmacy).toHaveLength(1);
  });

  it('ignora elementos sin coordenadas', () => {
    const grouped = groupByCategory(
      origin,
      [{ type: 'relation', id: 1, tags: { shop: 'supermarket' } }],
      [supermarket],
    );
    expect(grouped.supermarket).toHaveLength(0);
  });

  it('deja la categoría presente aunque no encuentre nada', () => {
    const grouped = groupByCategory(origin, [], [supermarket, park]);
    expect(grouped.supermarket).toEqual([]);
    expect(grouped.park).toEqual([]);
  });
});

describe('createOverpassProvider', () => {
  const supermarket = category({ id: 'supermarket' });
  const element = {
    type: 'node',
    id: 1,
    lat: 52.3907,
    lon: 13.0646,
    tags: { shop: 'supermarket', name: 'Cerca' },
  };

  const mockFetch = (
    handler: (url: string) => { ok: boolean; body?: unknown },
  ) => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url);
      const result = handler(url);
      return {
        ok: result.ok,
        status: result.ok ? 200 : 504,
        json: async () => result.body ?? {},
      } as Response;
    });
    return calls;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consulta la instancia principal y agrupa el resultado', async () => {
    const calls = mockFetch(() => ({ ok: true, body: { elements: [element] } }));
    const provider = createOverpassProvider({ url: 'https://primera/api' });

    const result = await provider.findNearby(origin, [supermarket]);

    expect(calls).toEqual(['https://primera/api']);
    expect(result.supermarket).toHaveLength(1);
    expect(result.supermarket?.[0]?.name).toBe('Cerca');
  });

  it('pasa al espejo siguiente si la primera instancia falla', async () => {
    const calls = mockFetch((url) => ({
      ok: url.includes('segunda'),
      body: { elements: [element] },
    }));
    const provider = createOverpassProvider({
      url: 'https://primera/api',
      fallbackUrls: ['https://segunda/api'],
    });

    const result = await provider.findNearby(origin, [supermarket]);

    expect(calls[0]).toBe('https://primera/api');
    expect(calls.at(-1)).toBe('https://segunda/api');
    expect(result.supermarket).toHaveLength(1);
  });

  it('lanza si ninguna instancia responde', async () => {
    mockFetch(() => ({ ok: false }));
    const provider = createOverpassProvider({
      url: 'https://primera/api',
      fallbackUrls: ['https://segunda/api'],
    });

    await expect(provider.findNearby(origin, [supermarket])).rejects.toThrow();
  });

  it('no consulta lo que ya está en caché', async () => {
    const cached = [{ osmId: 'node9', position: origin, straightLineKm: 0.1 }];
    const calls = mockFetch(() => ({ ok: true, body: { elements: [] } }));
    const provider = createOverpassProvider({
      url: 'https://primera/api',
      cache: { get: () => cached, set: () => {}, clear: () => {} },
    });

    const result = await provider.findNearby(origin, [supermarket]);

    expect(calls).toHaveLength(0);
    expect(result.supermarket).toEqual(cached);
  });

  it('guarda en caché lo que sí consulta', async () => {
    mockFetch(() => ({ ok: true, body: { elements: [element] } }));
    const saved: string[] = [];
    const provider = createOverpassProvider({
      url: 'https://primera/api',
      cache: { get: () => null, set: (_o, cat) => saved.push(cat.id), clear: () => {} },
    });

    await provider.findNearby(origin, [supermarket]);
    expect(saved).toEqual(['supermarket']);
  });
});
