import type { GeocodeResult, LatLng } from '@/types';
import { fetchJson } from './http';
import { createRateLimiter } from './rateLimit';

/**
 * Nominatim: geocodificación inversa al hacer clic en el mapa (sección 4).
 * Límite estricto de 1 req/s, así que todas las llamadas pasan por una cola
 * compartida en el módulo.
 */
interface NominatimReverseResponse {
  osm_id?: number;
  osm_type?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    country?: string;
  };
  error?: string;
}

export function mapNominatimResponse(
  data: NominatimReverseResponse,
  fallback: LatLng,
): GeocodeResult | null {
  if (data.error || !data.display_name) return null;
  const address = data.address ?? {};
  const city = address.city ?? address.town ?? address.village ?? address.suburb;
  const lat = data.lat !== undefined ? Number.parseFloat(data.lat) : fallback.lat;
  const lng = data.lon !== undefined ? Number.parseFloat(data.lon) : fallback.lng;

  return {
    id: data.osm_id ? `${data.osm_type ?? 'n'}${data.osm_id}` : `rev-${fallback.lat},${fallback.lng}`,
    label: data.display_name,
    position: {
      lat: Number.isFinite(lat) ? lat : fallback.lat,
      lng: Number.isFinite(lng) ? lng : fallback.lng,
    },
    ...(city ? { city } : {}),
    ...(address.country ? { country: address.country } : {}),
    ...(address.postcode ? { postcode: address.postcode } : {}),
  };
}

export interface NominatimOptions {
  baseUrl: string;
  lang?: string;
  minIntervalMs?: number;
}

export function createNominatimReverse({
  baseUrl,
  lang = 'es',
  minIntervalMs = 1100,
}: NominatimOptions) {
  const limiter = createRateLimiter(minIntervalMs);

  return async function reverse(position: LatLng, signal?: AbortSignal): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(position.lat),
      lon: String(position.lng),
      'accept-language': lang,
      zoom: '18',
    });

    return limiter(async () => {
      if (signal?.aborted) return null;
      const data = await fetchJson<NominatimReverseResponse>(
        `${baseUrl}/reverse?${params.toString()}`,
        { ...(signal ? { signal } : {}), retries: 1 },
      );
      return mapNominatimResponse(data, position);
    });
  };
}
