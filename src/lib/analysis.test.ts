import { describe, expect, it, vi } from 'vitest';
import type { PlacesProvider, RoutingProvider, TransitProvider } from '@/providers/types';
import type { FixedPlace, LatLng, NearbyPlace, PlaceCategory, TravelInfo } from '@/types';
import { analyzeCandidate, hasEstimatedTravel } from './analysis';

const origin: LatLng = { lat: 52.3906, lng: 13.0645 };

const place = (id: string, lat: number, lng: number): FixedPlace => ({
  id,
  label: `Lugar ${id}`,
  address: '',
  position: { lat, lng },
  scoring: { weight: 5, idealMin: 15, maxMin: 60 },
});

const fixedPlaces = [place('a', 52.4, 13.05), place('b', 52.52, 13.405)];

const okRouting = (): RoutingProvider => ({
  estimated: false,
  matrix: vi.fn<RoutingProvider['matrix']>(async (_origin, destinations, mode) =>
    destinations.map((_, index): TravelInfo => ({
      mode,
      durationMin: 10 + index,
      distanceKm: 1 + index,
      estimated: false,
    })),
  ),
});

const okTransit = (): TransitProvider => ({
  journey: vi.fn<TransitProvider['journey']>(async (): Promise<TravelInfo> => ({
    mode: 'transit',
    durationMin: 22,
    estimated: false,
    transfers: 1,
  })),
});

const baseInput = { origin, fixedPlaces, transitDepartureTime: '08:00', now: new Date(2026, 8, 28, 7) };

describe('analyzeCandidate', () => {
  it('calcula la distancia recta y los cuatro modos', async () => {
    const { fixed: results, blocks } = await analyzeCandidate({
      ...baseInput,
      routing: okRouting(),
      transit: okTransit(),
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.straightLineKm).toBeGreaterThan(0);
    expect(Object.keys(results[0]!.travel).sort()).toEqual(['bike', 'car', 'foot', 'transit']);
    expect(blocks.routing.status).toBe('ok');
    expect(blocks.transit.status).toBe('ok');
  });

  it('hace una sola llamada por modo, no una por lugar', async () => {
    const routing = okRouting();
    await analyzeCandidate({ ...baseInput, routing, transit: okTransit() });
    expect(routing.matrix).toHaveBeenCalledTimes(3);
  });

  it('marca fallback cuando el proveedor de rutas es estimado', async () => {
    const estimated: RoutingProvider = {
      estimated: true,
      matrix: async (_o, destinations, mode) =>
        destinations.map((): TravelInfo => ({ mode, durationMin: 5, estimated: true })),
    };
    const { blocks, fixed: results } = await analyzeCandidate({
      ...baseInput,
      routing: estimated,
      transit: okTransit(),
    });
    expect(blocks.routing.status).toBe('fallback');
    expect(blocks.routing.message).toContain('estimados');
    expect(hasEstimatedTravel(results)).toBe(true);
  });

  it('si falla un modo, estima ese y conserva los demás', async () => {
    const routing: RoutingProvider = {
      estimated: false,
      matrix: async (_o, destinations, mode) => {
        if (mode === 'car') throw new Error('502');
        return destinations.map((): TravelInfo => ({ mode, durationMin: 9, estimated: false }));
      },
    };

    const { fixed: results, blocks } = await analyzeCandidate({
      ...baseInput,
      routing,
      transit: okTransit(),
    });

    expect(blocks.routing.status).toBe('fallback');
    expect(results[0]?.travel.foot?.estimated).toBe(false);
    expect(results[0]?.travel.car?.estimated).toBe(true);
    expect(results[0]?.travel.car?.durationMin).toBeGreaterThan(0);
  });

  it('distingue una API key rechazada de un servicio caído', async () => {
    class HttpLikeError extends Error {
      constructor(public readonly status: number) {
        super(`estado ${status}`);
      }
    }
    const routing: RoutingProvider = {
      estimated: false,
      matrix: async () => {
        throw new HttpLikeError(403);
      },
    };

    const { blocks } = await analyzeCandidate({ ...baseInput, routing, transit: okTransit() });

    expect(blocks.routing.status).toBe('fallback');
    expect(blocks.routing.message).toContain('VITE_ORS_API_KEY');
  });

  it('si falla el transporte público, el resto sigue mostrándose', async () => {
    const transit: TransitProvider = { journey: async () => { throw new Error('503'); } };
    const { fixed: results, blocks } = await analyzeCandidate({
      ...baseInput,
      routing: okRouting(),
      transit,
    });

    expect(blocks.routing.status).toBe('ok');
    expect(blocks.transit.status).toBe('error');
    expect(blocks.transit.message).toContain('VBB');
    expect(results[0]?.travel.foot).toBeDefined();
    expect(results[0]?.travel.transit).toBeUndefined();
  });

  it('marca fallback parcial si sólo algunos lugares no tienen conexión', async () => {
    let call = 0;
    const transit: TransitProvider = {
      journey: async () => {
        call += 1;
        return call === 1 ? { mode: 'transit', durationMin: 30, estimated: false } : null;
      },
    };
    const { blocks } = await analyzeCandidate({ ...baseInput, routing: okRouting(), transit });
    expect(blocks.transit.status).toBe('fallback');
    expect(blocks.transit.message).toContain('1 de 2');
  });

  it('publica resultados parciales para pintarlos según llegan', async () => {
    const snapshots: number[] = [];
    await analyzeCandidate({
      ...baseInput,
      routing: okRouting(),
      transit: okTransit(),
      onPartial: ({ fixed }) =>
        snapshots.push(fixed.reduce((total, r) => total + Object.keys(r.travel).length, 0)),
    });

    expect(snapshots[0]).toBe(0);
    expect(snapshots.at(-1)).toBe(8); // 2 lugares × 4 modos
    expect(snapshots).toEqual([...snapshots].sort((a, b) => a - b));
  });

  it('sin lugares fijos no llama a ningún proveedor', async () => {
    const routing = okRouting();
    const transit = okTransit();
    const { fixed: results } = await analyzeCandidate({
      ...baseInput,
      fixedPlaces: [],
      routing,
      transit,
    });
    expect(results).toHaveLength(0);
    expect(routing.matrix).not.toHaveBeenCalled();
    expect(transit.journey).not.toHaveBeenCalled();
  });

  it('avisa si no hay providers configurados', async () => {
    const { blocks } = await analyzeCandidate({ ...baseInput });
    expect(blocks.routing.status).toBe('error');
    expect(blocks.transit.status).toBe('error');
  });
});


// --- Fase 3: lugares cercanos ------------------------------------------------

const category = (overrides: Partial<PlaceCategory> & { id: string }): PlaceCategory => ({
  label: overrides.id,
  icon: 'MapPin',
  enabled: true,
  kind: 'nearest',
  radiusM: 2000,
  osmFilters: ['["shop"="supermarket"]'],
  scoring: { weight: 4, idealMin: 5, maxMin: 20 },
  scoringMode: 'foot',
  ...overrides,
});

const nearby = (id: string, km: number): NearbyPlace => ({
  osmId: id,
  name: `Lugar ${id}`,
  position: { lat: 52.39 + km / 100, lng: 13.06 },
  straightLineKm: km,
});

describe('analyzeCandidate con categorías', () => {
  const supermarket = category({ id: 'supermarket' });
  const restaurants = category({
    id: 'restaurants',
    kind: 'density',
    radiusM: 600,
    scoring: { weight: 2, idealMin: 20, maxMin: 0 },
  });

  const placesProvider = (found: Record<string, NearbyPlace[]>): PlacesProvider => ({
    findNearby: vi.fn<PlacesProvider['findNearby']>(async () => found),
  });

  it('hace UNA sola consulta con todas las categorías', async () => {
    const places = placesProvider({ supermarket: [nearby('a', 0.3)], restaurants: [] });
    await analyzeCandidate({
      ...baseInput,
      categories: [supermarket, restaurants],
      routing: okRouting(),
      transit: okTransit(),
      places,
    });
    expect(places.findNearby).toHaveBeenCalledTimes(1);
  });

  it('se queda con el top 3 de las categorías nearest', async () => {
    const places = placesProvider({
      supermarket: [nearby('a', 0.2), nearby('b', 0.4), nearby('c', 0.6), nearby('d', 0.8)],
    });
    const { categories } = await analyzeCandidate({
      ...baseInput,
      fixedPlaces: [],
      categories: [supermarket],
      routing: okRouting(),
      places,
    });
    expect(categories[0]?.nearest).toHaveLength(3);
    expect(categories[0]?.nearest.map((place) => place.osmId)).not.toContain('d');
  });

  it('en density sólo cuenta, sin lista de lugares', async () => {
    const places = placesProvider({ restaurants: [nearby('a', 0.1), nearby('b', 0.2)] });
    const { categories } = await analyzeCandidate({
      ...baseInput,
      fixedPlaces: [],
      categories: [restaurants],
      routing: okRouting(),
      places,
    });
    expect(categories[0]?.countInRadius).toBe(2);
    expect(categories[0]?.nearest).toHaveLength(0);
  });

  it('enruta lugares fijos y POIs en la misma llamada por modo', async () => {
    const routing = okRouting();
    const places = placesProvider({ supermarket: [nearby('a', 0.3), nearby('b', 0.5)] });
    await analyzeCandidate({
      ...baseInput,
      categories: [supermarket],
      routing,
      places,
    });

    expect(routing.matrix).toHaveBeenCalledTimes(3);
    // 2 lugares fijos + 2 POIs en una sola matriz.
    const destinations = vi.mocked(routing.matrix).mock.calls[0]?.[1];
    expect(destinations).toHaveLength(4);
  });

  it('reordena el top 3 por tiempo real en el modo principal', async () => {
    // El más cercano en línea recta tarda más de verdad.
    const routing: RoutingProvider = {
      estimated: false,
      matrix: async (_o, destinations, mode) =>
        destinations.map((_, index): TravelInfo => ({
          mode,
          durationMin: index === 0 ? 30 : 5,
          estimated: false,
        })),
    };
    const places = placesProvider({ supermarket: [nearby('cerca', 0.2), nearby('lejos', 0.9)] });

    const { categories } = await analyzeCandidate({
      ...baseInput,
      fixedPlaces: [],
      categories: [supermarket],
      routing,
      places,
      primaryMode: 'foot',
    });

    expect(categories[0]?.nearest.map((place) => place.osmId)).toEqual(['lejos', 'cerca']);
  });

  it('si Overpass falla, los lugares fijos se siguen calculando', async () => {
    const places: PlacesProvider = {
      findNearby: async () => {
        throw new Error('504');
      },
    };
    const { fixed, categories, blocks } = await analyzeCandidate({
      ...baseInput,
      categories: [supermarket],
      routing: okRouting(),
      transit: okTransit(),
      places,
    });

    expect(blocks.places.status).toBe('error');
    expect(categories).toHaveLength(0);
    expect(blocks.routing.status).toBe('ok');
    expect(fixed[0]?.travel.foot).toBeDefined();
  });

  it('sin categorías habilitadas no consulta lugares', async () => {
    const places = placesProvider({});
    const { blocks } = await analyzeCandidate({
      ...baseInput,
      categories: [],
      routing: okRouting(),
      places,
    });
    expect(places.findNearby).not.toHaveBeenCalled();
    expect(blocks.places.status).toBe('skipped');
  });
});
