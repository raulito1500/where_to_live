import type { LatLng } from '@/types';

const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Distancia en línea recta (haversine) en kilómetros. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Redondeo de coordenadas: clave estable para la caché de Overpass (~11 m). */
export function roundCoord(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function roundPosition(position: LatLng, decimals = 4): LatLng {
  return { lat: roundCoord(position.lat, decimals), lng: roundCoord(position.lng, decimals) };
}

export function isValidLatLng(value: unknown): value is LatLng {
  if (typeof value !== 'object' || value === null) return false;
  const { lat, lng } = value as Partial<LatLng>;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export function samePosition(a: LatLng, b: LatLng, decimals = 5): boolean {
  return roundCoord(a.lat, decimals) === roundCoord(b.lat, decimals) &&
    roundCoord(a.lng, decimals) === roundCoord(b.lng, decimals);
}

/** Caja que contiene todas las posiciones; `null` si la lista está vacía. */
export function boundsOf(positions: LatLng[]): { south: number; west: number; north: number; east: number } | null {
  if (positions.length === 0) return null;
  return positions.reduce(
    (acc, p) => ({
      south: Math.min(acc.south, p.lat),
      west: Math.min(acc.west, p.lng),
      north: Math.max(acc.north, p.lat),
      east: Math.max(acc.east, p.lng),
    }),
    { south: 90, west: 180, north: -90, east: -180 },
  );
}
