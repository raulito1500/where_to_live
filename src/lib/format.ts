import type { LatLng } from '@/types';

/** "8 min", "1 h 05 min", "—" si no hay dato. */
export function formatDuration(minutes: number | undefined | null): string {
  if (minutes === undefined || minutes === null || !Number.isFinite(minutes)) return '—';
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')} min`;
}

/** "450 m" bajo 1 km, "2,3 km" por encima. */
export function formatDistanceKm(km: number | undefined | null): string {
  if (km === undefined || km === null || !Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function formatMeters(meters: number): string {
  return meters >= 1000 ? formatDistanceKm(meters / 1000) : `${Math.round(meters)} m`;
}

export function formatScore(score: number | undefined | null): string {
  if (score === undefined || score === null || !Number.isFinite(score)) return '—';
  return String(Math.round(score));
}

export function formatCoords(position: LatLng, decimals = 5): string {
  return `${position.lat.toFixed(decimals)}, ${position.lng.toFixed(decimals)}`;
}

/** Fecha corta en español, a partir de un ISO string. */
export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
