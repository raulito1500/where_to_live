/**
 * Modelo de datos de la app (sección 5 de la spec).
 * Estos tipos son la frontera entre la UI y los providers: los componentes y
 * hooks sólo conocen estos tipos, nunca las respuestas crudas de OSM/Google.
 */

export type TravelMode = 'foot' | 'bike' | 'car' | 'transit';

export const TRAVEL_MODES: readonly TravelMode[] = ['foot', 'bike', 'car', 'transit'];

/** Modos que se resuelven con `RoutingProvider.matrix` (transit va aparte). */
export type RoutableMode = Exclude<TravelMode, 'transit'>;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Importancia y umbrales de un elemento puntuable (lugar fijo o categoría). */
export interface ScoringRule {
  /** 0 (no importa) a 5 (crítico). */
  weight: number;
  /** Hasta este valor => 100 puntos. En `density` se lee como conteo ideal. */
  idealMin: number;
  /** Desde este valor => 0 puntos. En `density` se lee como conteo mínimo. */
  maxMin: number;
}

export interface FixedPlace {
  id: string;
  /** Nombre libre: "Universidad", "Trabajo de Ana"... */
  label: string;
  address: string;
  position: LatLng;
  /** Nombre de icono de lucide-react. */
  icon?: string;
  scoring: ScoringRule;
}

export interface TravelInfo {
  mode: TravelMode;
  durationMin: number;
  distanceKm?: number;
  /** true si viene del fallback estimado (sin API key de rutas). */
  estimated: boolean;
  /** Solo transit. */
  transfers?: number;
}

export type TravelByMode = Partial<Record<TravelMode, TravelInfo>>;

export interface FixedPlaceResult {
  fixedPlaceId: string;
  straightLineKm: number;
  travel: TravelByMode;
}

export interface NearbyPlace {
  osmId: string;
  name?: string;
  position: LatLng;
  straightLineKm: number;
  /** Solo el top-N enrutado. */
  travel?: TravelByMode;
}

export interface CategoryResult {
  categoryId: string;
  /** Top 3 ordenados por tiempo real (o por distancia recta si no hay rutas). */
  nearest: NearbyPlace[];
  /** Usado en categorías de tipo `density`. */
  countInRadius?: number;
  radiusM: number;
}

export interface ScoreBreakdownItem {
  itemId: string;
  label: string;
  score: number;
  weight: number;
}

export interface CandidateScore {
  /** 0-100, promedio ponderado. */
  total: number;
  breakdown: ScoreBreakdownItem[];
  /** true si se excluyeron elementos por falta de datos ("puntuación parcial"). */
  partial?: boolean;
}

export interface CandidateAnalysis {
  computedAt: string;
  fixed: FixedPlaceResult[];
  categories: CategoryResult[];
  /**
   * La puntuación NO se guarda aquí: es un valor derivado que se recalcula al
   * vuelo desde los pesos y umbrales de Ajustes (sección 7.1), para que
   * cambiarlos la actualice al instante. El campo queda por compatibilidad con
   * datos antiguos; la UI usa `useCandidateScore`.
   */
  score?: CandidateScore;
}

export interface Candidate {
  id: string;
  /** "Apto Babelsberg 2 hab" */
  name: string;
  address: string;
  position: LatLng;
  notes?: string;
  listingUrl?: string;
  /** ISO */
  createdAt: string;
  analysis?: CandidateAnalysis;
  /** true cuando cambió un lugar fijo o un ajuste y hay que recalcular (8.5). */
  stale?: boolean;
}

export type CategoryKind = 'nearest' | 'density';

export interface PlaceCategory {
  id: string;
  label: string;
  /** Nombre de icono de lucide-react. */
  icon: string;
  enabled: boolean;
  kind: CategoryKind;
  /** Radio de búsqueda en metros. */
  radiusM: number;
  /** Filtros OSM, ej. ['["shop"="supermarket"]']. */
  osmFilters: string[];
  /** En `nearest`: tiempos. En `density`: conteos (ver 7.1). */
  scoring: ScoringRule;
  /** Modo con el que se puntúa (ej. supermercado => 'foot'). */
  scoringMode: TravelMode;
  /** Categoría creada por el usuario (no se pierde al restaurar defaults). */
  custom?: boolean;
  /** Reservado para la migración a Google (sección 6). */
  googleTypes?: string[];
}

export interface Settings {
  /** Modo destacado en tarjetas y usado para puntuar lugares fijos. */
  primaryMode: TravelMode;
  /** "08:00", día laboral próximo, para consultas de transit. */
  transitDepartureTime: string;
  categories: PlaceCategory[];
  /** Umbrales bajo/medio/alto para las categorías `density` (sección 15). */
  densityThresholds: { low: number; high: number };
}

/** Resultado normalizado de geocodificación (usado por GeocodingProvider). */
export interface GeocodeResult {
  id: string;
  label: string;
  position: LatLng;
  city?: string;
  country?: string;
  postcode?: string;
}
