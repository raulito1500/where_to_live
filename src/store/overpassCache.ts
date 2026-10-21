import { roundPosition } from '@/lib/geo';
import type { NearbyCache } from '@/providers/types';
import type { LatLng, NearbyPlace, PlaceCategory } from '@/types';
import { STORAGE_KEYS } from './keys';
import { readRaw, removeRaw, writeRaw } from './storage';

/**
 * Caché de Overpass en localStorage (sección 7): clave por coordenada
 * redondeada a 4 decimales (~11 m), categoría y radio, con TTL de 7 días.
 * El botón "Recalcular" la ignora forzando una consulta nueva.
 */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  at: number;
  places: NearbyPlace[];
}

type CacheShape = Record<string, CacheEntry>;

export function cacheKey(origin: LatLng, category: PlaceCategory): string {
  const { lat, lng } = roundPosition(origin, 4);
  return `${lat},${lng}|${category.id}|${category.radiusM}`;
}

function readAll(): CacheShape {
  const raw = readRaw(STORAGE_KEYS.overpassCache);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as CacheShape) : {};
  } catch {
    return {};
  }
}

/** Al escribir se podan las entradas caducadas: la caché no crece sin fin. */
function writeAll(cache: CacheShape): void {
  const now = Date.now();
  const fresh: CacheShape = {};
  for (const [key, entry] of Object.entries(cache)) {
    if (now - entry.at < CACHE_TTL_MS) fresh[key] = entry;
  }
  writeRaw(STORAGE_KEYS.overpassCache, JSON.stringify(fresh));
}

export function createOverpassCache(ttlMs = CACHE_TTL_MS): NearbyCache {
  return {
    get(origin, category) {
      const entry = readAll()[cacheKey(origin, category)];
      if (!entry) return null;
      if (Date.now() - entry.at >= ttlMs) return null;
      return entry.places;
    },

    set(origin, category, places) {
      const cache = readAll();
      cache[cacheKey(origin, category)] = { at: Date.now(), places };
      writeAll(cache);
    },

    clear() {
      removeRaw(STORAGE_KEYS.overpassCache);
    },
  };
}

export const overpassCache = createOverpassCache();
