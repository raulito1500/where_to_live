import { haversineKm } from '@/lib/geo';
import type { LatLng, NearbyPlace, PlaceCategory } from '@/types';
import type { NearbyCache, PlacesProvider } from '../types';
import { fetchJson } from './http';

/**
 * Overpass API (sección 4): una sola consulta por candidato con todas las
 * categorías habilitadas; la clasificación por categoría se hace en el cliente.
 */
interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

export interface TagCondition {
  key: string;
  op: '=' | '!=';
  value: string;
}

const CONDITION = /\["([^"]+)"\s*(!?=)\s*"([^"]+)"\]/g;

/** `["shop"="supermarket"]["access"!="private"]` -> lista de condiciones. */
export function parseOsmFilter(filter: string): TagCondition[] {
  const conditions: TagCondition[] = [];
  for (const match of filter.matchAll(CONDITION)) {
    const [, key, op, value] = match;
    if (key && value) conditions.push({ key, op: op === '!=' ? '!=' : '=', value });
  }
  return conditions;
}

export function matchesFilter(tags: Record<string, string>, conditions: TagCondition[]): boolean {
  if (conditions.length === 0) return false;
  return conditions.every(({ key, op, value }) =>
    op === '=' ? tags[key] === value : tags[key] !== value,
  );
}

/** Una categoría acepta el elemento si CUALQUIERA de sus filtros encaja. */
export function matchesCategory(tags: Record<string, string>, category: PlaceCategory): boolean {
  return category.osmFilters.some((filter) => matchesFilter(tags, parseOsmFilter(filter)));
}

export function buildOverpassQuery(
  origin: LatLng,
  categories: PlaceCategory[],
  timeoutS = 25,
): string {
  const coords = `${origin.lat},${origin.lng}`;
  const lines = categories.flatMap((category) =>
    category.osmFilters.map(
      (filter) => `  nwr(around:${category.radiusM},${coords})${filter};`,
    ),
  );
  return `[out:json][timeout:${timeoutS}];\n(\n${lines.join('\n')}\n);\nout center tags;`;
}

function positionOf(element: OverpassElement): LatLng | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

/**
 * Reparte los elementos entre las categorías. Un elemento puede caer en varias
 * (un hospital con farmacia), y se filtra por el radio propio de cada una
 * porque la consulta mezcla radios distintos.
 */
export function groupByCategory(
  origin: LatLng,
  elements: OverpassElement[],
  categories: PlaceCategory[],
): Record<string, NearbyPlace[]> {
  const grouped: Record<string, NearbyPlace[]> = {};
  const seen: Record<string, Set<string>> = {};

  for (const category of categories) {
    grouped[category.id] = [];
    seen[category.id] = new Set();
  }

  for (const element of elements) {
    const position = positionOf(element);
    const tags = element.tags ?? {};
    if (!position) continue;

    const osmId = `${element.type ?? 'n'}${element.id ?? ''}`;
    const straightLineKm = haversineKm(origin, position);

    for (const category of categories) {
      if (straightLineKm * 1000 > category.radiusM) continue;
      if (!matchesCategory(tags, category)) continue;
      if (seen[category.id]?.has(osmId)) continue;

      seen[category.id]?.add(osmId);
      grouped[category.id]?.push({
        osmId,
        ...(tags.name ? { name: tags.name } : {}),
        position,
        straightLineKm,
      });
    }
  }

  // Orden inicial por distancia recta; el análisis reordena por tiempo real.
  for (const places of Object.values(grouped)) {
    places.sort((a, b) => a.straightLineKm - b.straightLineKm);
  }

  return grouped;
}

/**
 * Instancias públicas de Overpass. Se caen, limitan por IP y rechazan
 * peticiones con frecuencia, así que se prueban en orden hasta que una
 * responda. La primera se puede cambiar con `VITE_OVERPASS_URL`.
 */
export const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

export interface OverpassOptions {
  /** Instancia principal. */
  url: string;
  /** Instancias de reserva; por defecto los espejos conocidos. */
  fallbackUrls?: string[];
  /** Caché con TTL; sin ella se consulta siempre. */
  cache?: NearbyCache;
}

export function createOverpassProvider({
  url,
  fallbackUrls,
  cache,
}: OverpassOptions): PlacesProvider {
  // Sin duplicados y con la principal primero.
  const endpoints = [...new Set([url, ...(fallbackUrls ?? OVERPASS_MIRRORS)])];
  return {
    async findNearby(origin, categories, signal) {
      if (categories.length === 0) return {};

      // Sólo se consulta lo que no esté en caché fresca (sección 7).
      const results: Record<string, NearbyPlace[]> = {};
      const missing: PlaceCategory[] = [];

      for (const category of categories) {
        const cached = cache?.get(origin, category);
        if (cached) results[category.id] = cached;
        else missing.push(category);
      }

      if (missing.length === 0) return results;

      const query = buildOverpassQuery(origin, missing);
      let data: OverpassResponse | null = null;
      let lastError: unknown;

      for (const endpoint of endpoints) {
        try {
          data = await fetchJson<OverpassResponse>(endpoint, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            ...(signal ? { signal } : {}),
            // Overpass devuelve 429/504 a menudo; sólo 1 reintento por
            // instancia para pasar pronto a la siguiente.
            retries: 1,
            timeoutMs: 40_000,
          });
          break;
        } catch (error) {
          if (signal?.aborted) throw error;
          lastError = error;
        }
      }

      if (!data) {
        throw lastError instanceof Error
          ? lastError
          : new Error('Ninguna instancia de Overpass respondió');
      }

      const grouped = groupByCategory(origin, data.elements ?? [], missing);
      for (const category of missing) {
        const places = grouped[category.id] ?? [];
        results[category.id] = places;
        cache?.set(origin, category, places);
      }

      return results;
    },
  };
}
