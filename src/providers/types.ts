import type {
  GeocodeResult,
  LatLng,
  NearbyPlace,
  PlaceCategory,
  RoutableMode,
  TravelInfo,
} from '@/types';

/**
 * Contratos de datos (sección 6 de la spec).
 * Toda la app depende SÓLO de estas interfaces, nunca de OSM ni de Google
 * directamente. Cambiar de proveedor = implementar estas interfaces sin tocar
 * `components/` ni `hooks/`.
 */

export interface GeocodingProvider {
  /** Autocompletado de direcciones. `bias` acerca los resultados a una zona. */
  search(query: string, bias?: LatLng, signal?: AbortSignal): Promise<GeocodeResult[]>;
  /** Geocodificación inversa (usada al hacer clic en el mapa). */
  reverse(position: LatLng, signal?: AbortSignal): Promise<GeocodeResult | null>;
}

/**
 * Caché de lugares cercanos (sección 7): clave por coordenada redondeada,
 * categoría y radio, con TTL. Se inyecta para que el provider no dependa de
 * localStorage y se pueda probar sin navegador.
 */
export interface NearbyCache {
  get(origin: LatLng, category: PlaceCategory): NearbyPlace[] | null;
  set(origin: LatLng, category: PlaceCategory, places: NearbyPlace[]): void;
  clear(): void;
}

export interface PlacesProvider {
  /** Una consulta por candidato con todas las categorías; agrupado por categoría. */
  findNearby(
    origin: LatLng,
    categories: PlaceCategory[],
    signal?: AbortSignal,
  ): Promise<Record<string, NearbyPlace[]>>;
}

export interface RoutingProvider {
  /** 1 origen -> N destinos, por modo. Mismo orden que `destinations`. */
  matrix(
    origin: LatLng,
    destinations: LatLng[],
    mode: RoutableMode,
    signal?: AbortSignal,
  ): Promise<TravelInfo[]>;
  /**
   * Geometría de una ruta concreta, para dibujarla en el mapa (sección 8.1).
   * Opcional: un proveedor puede dar tiempos sin dar el trazado.
   */
  route?(
    origin: LatLng,
    destination: LatLng,
    mode: RoutableMode,
    signal?: AbortSignal,
  ): Promise<RouteGeometry | null>;
  /** true si los tiempos son estimados (sin API key de rutas). */
  readonly estimated: boolean;
}

export interface RouteGeometry {
  points: LatLng[];
  travel: TravelInfo;
}

export interface TransitProvider {
  journey(from: LatLng, to: LatLng, departure: Date, signal?: AbortSignal): Promise<TravelInfo | null>;
}

/** Fuente de tiles del mapa; la consume `<MapView />`, no los componentes. */
export interface TileSource {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
}

export type ProviderId = 'osm' | 'google';

/**
 * Los miembros son opcionales a propósito: cada fase habilita el suyo y la UI
 * muestra un aviso claro cuando una capacidad todavía no está disponible.
 */
export interface ProviderBundle {
  id: ProviderId;
  tiles: TileSource;
  geocoding?: GeocodingProvider; // Fase 1
  routing?: RoutingProvider; // Fase 2
  transit?: TransitProvider; // Fase 2
  places?: PlacesProvider; // Fase 3
}

export class ProviderUnavailableError extends Error {
  constructor(public readonly capability: keyof ProviderBundle) {
    super(`El proveedor de "${capability}" no está disponible todavía.`);
    this.name = 'ProviderUnavailableError';
  }
}

/** Uso en hooks: `const geo = requireProvider(providers.geocoding, 'geocoding')`. */
export function requireProvider<T>(value: T | undefined, capability: keyof ProviderBundle): T {
  if (!value) throw new ProviderUnavailableError(capability);
  return value;
}
