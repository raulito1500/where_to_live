import type { GeocodingProvider } from '../types';
import { createNominatimReverse } from './nominatim';
import { createPhotonSearch } from './photon';

export interface OsmGeocodingOptions {
  photonUrl: string;
  nominatimUrl: string;
}

/**
 * `GeocodingProvider` de OSM: Photon para autocompletar y Nominatim para el
 * reverse. Son dos servicios distintos detrás de una sola interfaz, justo lo que
 * permite cambiarlos por Google sin tocar la UI (sección 6).
 */
export function createOsmGeocodingProvider({
  photonUrl,
  nominatimUrl,
}: OsmGeocodingOptions): GeocodingProvider {
  return {
    search: createPhotonSearch({ baseUrl: photonUrl }),
    reverse: createNominatimReverse({ baseUrl: nominatimUrl }),
  };
}
