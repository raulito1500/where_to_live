/**
 * Claves de localStorage con versión para migraciones (sección 11).
 * Cambiar `STORAGE_VERSION` obliga a escribir una migración en cada store.
 */
export const STORAGE_VERSION = 1;

const prefix = `wtl:v${STORAGE_VERSION}` as const;

export const STORAGE_KEYS = {
  fixedPlaces: `${prefix}:fixedPlaces`,
  candidates: `${prefix}:candidates`,
  settings: `${prefix}:settings`,
  overpassCache: `${prefix}:cache:overpass`,
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
