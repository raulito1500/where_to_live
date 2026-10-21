import type { LatLng, RoutableMode, TravelInfo } from '@/types';
import { haversineKm } from './geo';

/**
 * Fallback sin API key de rutas (sección 4): distancia en línea recta × 1.3 y
 * una velocidad por modo. Los valores salen marcados como `estimated` para que
 * la UI lo advierta.
 */
export const DETOUR_FACTOR = 1.3;

export const FALLBACK_SPEEDS_KMH: Record<RoutableMode, number> = {
  foot: 5,
  bike: 15,
  car: 30,
};

export function estimateTravelFromKm(straightLineKm: number, mode: RoutableMode): TravelInfo {
  const distanceKm = straightLineKm * DETOUR_FACTOR;
  const durationMin = (distanceKm / FALLBACK_SPEEDS_KMH[mode]) * 60;
  return {
    mode,
    durationMin: Math.round(durationMin * 10) / 10,
    distanceKm: Math.round(distanceKm * 100) / 100,
    estimated: true,
  };
}

export function estimateTravel(origin: LatLng, destination: LatLng, mode: RoutableMode): TravelInfo {
  return estimateTravelFromKm(haversineKm(origin, destination), mode);
}
