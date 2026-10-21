import { estimateTravelFromKm } from '@/lib/estimateTravel';
import { haversineKm } from '@/lib/geo';
import type { LatLng, RoutableMode, TravelInfo } from '@/types';
import type { RouteGeometry, RoutingProvider } from '../types';
import { fetchJson } from './http';

/**
 * OpenRouteService (sección 4). Requiere API key gratuita; sin ella se usa
 * `createEstimatedRoutingProvider`, que responde lo mismo pero marcado como
 * estimado, de modo que el resto de la app no cambia.
 */
const PROFILE: Record<RoutableMode, string> = {
  foot: 'foot-walking',
  bike: 'cycling-regular',
  car: 'driving-car',
};

/**
 * El plan gratuito limita las locaciones por matriz; se trocea para no pasarse
 * y porque una matriz enorme tarda más que varias pequeñas.
 * Revisar la documentación vigente si cambian las cuotas.
 */
export const MAX_DESTINATIONS_PER_MATRIX = 45;

const BASE_URL = 'https://api.openrouteservice.org';

interface OrsMatrixResponse {
  durations?: (number | null)[][];
  distances?: (number | null)[][];
}

interface OrsDirectionsResponse {
  features?: {
    geometry?: { coordinates?: [number, number][] };
    properties?: { summary?: { duration?: number; distance?: number } };
  }[];
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export interface OrsOptions {
  apiKey: string;
  baseUrl?: string;
}

export function createOrsRoutingProvider({ apiKey, baseUrl = BASE_URL }: OrsOptions): RoutingProvider {
  const headers = { Authorization: apiKey };

  async function matrixChunk(
    origin: LatLng,
    destinations: LatLng[],
    mode: RoutableMode,
    signal?: AbortSignal,
  ): Promise<TravelInfo[]> {
    const data = await fetchJson<OrsMatrixResponse>(`${baseUrl}/v2/matrix/${PROFILE[mode]}`, {
      method: 'POST',
      headers,
      ...(signal ? { signal } : {}),
      body: {
        // ORS usa [lng, lat]; el índice 0 es el origen.
        locations: [origin, ...destinations].map((point) => [point.lng, point.lat]),
        sources: [0],
        destinations: destinations.map((_, index) => index + 1),
        metrics: ['duration', 'distance'],
        units: 'km',
      },
    });

    const durations = data.durations?.[0] ?? [];
    const distances = data.distances?.[0] ?? [];

    return destinations.map((destination, index) => {
      const seconds = durations[index];
      // ORS devuelve null cuando no encuentra ruta (isla, zona sin vías):
      // se cae a la estimación en vez de dejar el dato en blanco.
      if (seconds === null || seconds === undefined) {
        return estimateTravelFromKm(haversineKm(origin, destination), mode);
      }
      const km = distances[index];
      return {
        mode,
        durationMin: Math.round((seconds / 60) * 10) / 10,
        ...(typeof km === 'number' ? { distanceKm: Math.round(km * 100) / 100 } : {}),
        estimated: false,
      };
    });
  }

  return {
    estimated: false,

    async matrix(origin, destinations, mode, signal) {
      if (destinations.length === 0) return [];
      const results: TravelInfo[] = [];
      for (const group of chunk(destinations, MAX_DESTINATIONS_PER_MATRIX)) {
        results.push(...(await matrixChunk(origin, group, mode, signal)));
      }
      return results;
    },

    async route(origin, destination, mode, signal): Promise<RouteGeometry | null> {
      const data = await fetchJson<OrsDirectionsResponse>(
        `${baseUrl}/v2/directions/${PROFILE[mode]}/geojson`,
        {
          method: 'POST',
          headers,
          ...(signal ? { signal } : {}),
          retries: 1,
          body: {
            coordinates: [
              [origin.lng, origin.lat],
              [destination.lng, destination.lat],
            ],
          },
        },
      );

      const feature = data.features?.[0];
      const coordinates = feature?.geometry?.coordinates;
      if (!coordinates || coordinates.length === 0) return null;

      const summary = feature?.properties?.summary;
      return {
        points: coordinates.map(([lng, lat]) => ({ lat, lng })),
        travel: {
          mode,
          durationMin: summary?.duration ? Math.round((summary.duration / 60) * 10) / 10 : 0,
          ...(summary?.distance ? { distanceKm: Math.round((summary.distance / 1000) * 100) / 100 } : {}),
          estimated: false,
        },
      };
    },
  };
}

/**
 * Sin API key: mismos datos, calculados con la línea recta (sección 4).
 * No hay geometría de ruta, así que `route` queda sin implementar.
 */
export function createEstimatedRoutingProvider(): RoutingProvider {
  return {
    estimated: true,
    async matrix(origin, destinations, mode) {
      return destinations.map((destination) =>
        estimateTravelFromKm(haversineKm(origin, destination), mode),
      );
    },
  };
}
