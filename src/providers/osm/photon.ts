import type { GeocodeResult, LatLng } from '@/types';
import { fetchJson } from './http';

/**
 * Photon (Komoot): autocompletado de direcciones sin API key (sección 4).
 * Devuelve GeoJSON; aquí se normaliza a `GeocodeResult` para que la UI no
 * conozca el formato de OSM.
 */
interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

/** "Calle 12, 14471 Potsdam, Alemania" a partir de las partes disponibles. */
export function buildPhotonLabel(properties: NonNullable<PhotonFeature['properties']>): string {
  const street = [properties.street, properties.housenumber].filter(Boolean).join(' ');
  const primary = properties.name ?? street;
  const secondary = street && street !== primary ? street : undefined;
  const locality = [properties.postcode, properties.city ?? properties.district]
    .filter(Boolean)
    .join(' ');
  return [primary, secondary, locality, properties.country].filter(Boolean).join(', ');
}

export function mapPhotonFeature(feature: PhotonFeature, index: number): GeocodeResult | null {
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;
  if (!coordinates || !properties) return null;
  const [lng, lat] = coordinates;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const label = buildPhotonLabel(properties);
  if (label === '') return null;

  return {
    id: properties.osm_id ? `${properties.osm_type ?? 'n'}${properties.osm_id}` : `photon-${index}`,
    label,
    position: { lat, lng },
    ...(properties.city ? { city: properties.city } : {}),
    ...(properties.country ? { country: properties.country } : {}),
    ...(properties.postcode ? { postcode: properties.postcode } : {}),
  };
}

/**
 * Photon sólo admite estos idiomas: con cualquier otro responde 400. La UI está
 * en español, pero el idioma aquí sólo afecta a los nombres de los lugares, así
 * que se usa `de` (el caso de uso es Alemania) y se ignora lo no soportado.
 */
export const PHOTON_LANGS = ['default', 'de', 'en', 'fr'] as const;
export type PhotonLang = (typeof PHOTON_LANGS)[number];

export function normalizePhotonLang(lang: string): PhotonLang {
  return (PHOTON_LANGS as readonly string[]).includes(lang) ? (lang as PhotonLang) : 'default';
}

export interface PhotonOptions {
  baseUrl: string;
  limit?: number;
  lang?: string;
}

export function createPhotonSearch({ baseUrl, limit = 8, lang = 'de' }: PhotonOptions) {
  return async function search(
    query: string,
    bias?: LatLng,
    signal?: AbortSignal,
  ): Promise<GeocodeResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];

    const params = new URLSearchParams({
      q: trimmed,
      limit: String(limit),
      lang: normalizePhotonLang(lang),
    });
    // El sesgo acerca los resultados a la zona que el usuario está mirando.
    if (bias) {
      params.set('lat', String(bias.lat));
      params.set('lon', String(bias.lng));
    }

    const data = await fetchJson<PhotonResponse>(`${baseUrl}/api?${params.toString()}`, {
      ...(signal ? { signal } : {}),
      retries: 1,
    });

    const results: GeocodeResult[] = [];
    const seen = new Set<string>();
    for (const [index, feature] of (data.features ?? []).entries()) {
      const result = mapPhotonFeature(feature, index);
      // Photon repite la misma dirección con distintos osm_type; se deduplica.
      if (result && !seen.has(result.label)) {
        seen.add(result.label);
        results.push(result);
      }
    }
    return results;
  };
}
