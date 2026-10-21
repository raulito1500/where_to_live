import { providerConfig, type ProviderConfig } from './env';
import { createOsmGeocodingProvider } from './osm/geocoding';
import { createEstimatedRoutingProvider, createOrsRoutingProvider } from './osm/ors';
import { createOverpassProvider } from './osm/overpass';
import { createTransitRestProvider } from './osm/transitRest';
import { overpassCache } from '@/store/overpassCache';
import { selectTileSource } from './tiles';
import type { NearbyCache, ProviderBundle } from './types';

/**
 * Selección del provider según `VITE_PROVIDER` (sección 6).
 *
 * Capacidades enchufadas hasta ahora:
 *   Fase 1 -> geocoding (osm/photon.ts, osm/nominatim.ts)
 *   Fase 2 -> routing (osm/ors.ts), transit (osm/transitRest.ts)
 *   Fase 3 -> places (osm/overpass.ts)
 * La UI nunca importa de `providers/osm/**`; sólo usa este bundle.
 */
/**
 * La caché de lugares se inyecta: en la app es localStorage, en los tests puede
 * no existir. Se pasa desde `main`/`index` para no acoplar el provider al
 * navegador.
 */
export function createProviders(
  config: ProviderConfig = providerConfig,
  cache?: NearbyCache,
): ProviderBundle {
  const tiles = selectTileSource({ source: config.tileSource, cartoApiKey: config.cartoApiKey });

  if (config.providerId === 'google') {
    // Fase 2 de la migración: adaptadores en providers/google/.
    return { id: 'google', tiles };
  }
  return {
    id: 'osm',
    tiles,
    geocoding: createOsmGeocodingProvider({
      photonUrl: config.photonUrl,
      nominatimUrl: config.nominatimUrl,
    }),
    // Sin API key la app sigue funcionando con tiempos estimados (sección 4).
    routing:
      config.orsApiKey !== ''
        ? createOrsRoutingProvider({ apiKey: config.orsApiKey })
        : createEstimatedRoutingProvider(),
    transit: createTransitRestProvider({ baseUrl: config.transitBaseUrl }),
    places: createOverpassProvider({
      url: config.overpassUrl,
      ...(cache ? { cache } : {}),
    }),
  };
}

export const providers: ProviderBundle = createProviders(providerConfig, overpassCache);

export { providerConfig, providerStatus } from './env';
export { ESRI_LIGHT_GRAY, OSM_STANDARD, selectTileSource } from './tiles';
export type { ProviderConfig, ProviderStatusItem } from './env';
export * from './types';
