import type { PlacesProvider, RoutingProvider, TransitProvider } from '@/providers/types';
import type {
  CategoryResult,
  FixedPlace,
  FixedPlaceResult,
  LatLng,
  NearbyPlace,
  PlaceCategory,
  RoutableMode,
  TravelByMode,
  TravelMode,
} from '@/types';
import { estimateTravelFromKm } from './estimateTravel';
import { haversineKm } from './geo';
import { nextWeekdayDeparture } from './schedule';

/**
 * Orquestación del análisis de un candidato (sección 7), sin React ni acceso a
 * stores: recibe providers y datos, devuelve resultados. Así se puede probar
 * entera y la UI sólo consume el resultado.
 */
export const ROUTABLE_MODES: readonly RoutableMode[] = ['foot', 'bike', 'car'];

/** Cuántos lugares por categoría se enrutan y se muestran (sección 7). */
export const NEAREST_LIMIT = 3;

export type BlockStatus = 'ok' | 'fallback' | 'error' | 'skipped';

export interface BlockState {
  status: BlockStatus;
  /** Mensaje para la UI cuando no es `ok`. */
  message?: string;
}

export interface AnalysisBlocks {
  routing: BlockState;
  transit: BlockState;
  places: BlockState;
}

export interface AnalysisSnapshot {
  fixed: FixedPlaceResult[];
  categories: CategoryResult[];
}

export interface AnalyzeCandidateInput {
  origin: LatLng;
  fixedPlaces: FixedPlace[];
  /** Sólo las categorías habilitadas. */
  categories?: PlaceCategory[];
  routing?: RoutingProvider | undefined;
  transit?: TransitProvider | undefined;
  places?: PlacesProvider | undefined;
  transitDepartureTime: string;
  /** Modo con el que se reordena el top 3 de cada categoría. */
  primaryMode?: TravelMode;
  /** Inyectable para tests deterministas. */
  now?: Date;
  signal?: AbortSignal;
  /** Resultados parciales para pintar según llegan (sección 7, paso 5). */
  onPartial?: (snapshot: AnalysisSnapshot) => void;
}

export interface AnalyzeCandidateOutput extends AnalysisSnapshot {
  blocks: AnalysisBlocks;
}

/**
 * 401/403 del servicio de rutas = API key ausente, mal copiada o sin permisos.
 * Se lee el `status` de forma estructural para no acoplar esta capa a la
 * implementación concreta del adaptador.
 */
function isAuthError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return status === 401 || status === 403;
}

/** Destino enrutado: puede ser un lugar fijo o un POI del top 3. */
interface Destination {
  position: LatLng;
  straightLineKm: number;
  apply: (mode: RoutableMode, travel: TravelByMode[RoutableMode]) => void;
}

export async function analyzeCandidate({
  origin,
  fixedPlaces,
  categories = [],
  routing,
  transit,
  places,
  transitDepartureTime,
  primaryMode = 'foot',
  now,
  signal,
  onPartial,
}: AnalyzeCandidateInput): Promise<AnalyzeCandidateOutput> {
  const fixed: FixedPlaceResult[] = fixedPlaces.map((place) => ({
    fixedPlaceId: place.id,
    straightLineKm: haversineKm(origin, place.position),
    travel: {} as TravelByMode,
  }));
  let categoryResults: CategoryResult[] = [];

  const blocks: AnalysisBlocks = {
    routing: { status: 'skipped' },
    transit: { status: 'skipped' },
    places: { status: 'skipped' },
  };

  const publish = () => onPartial?.({ fixed: [...fixed], categories: [...categoryResults] });
  publish();

  // --- Bloque de lugares cercanos: UNA consulta con todas las categorías ----
  if (places && categories.length > 0) {
    try {
      const found = await places.findNearby(origin, categories, signal);
      categoryResults = categories.map((category) => {
        const all = found[category.id] ?? [];
        return category.kind === 'density'
          ? { categoryId: category.id, nearest: [], countInRadius: all.length, radiusM: category.radiusM }
          : { categoryId: category.id, nearest: all.slice(0, NEAREST_LIMIT), radiusM: category.radiusM };
      });
      blocks.places = { status: 'ok' };
    } catch (error) {
      if (signal?.aborted) throw error;
      blocks.places = {
        status: 'error',
        message:
          'No se pudieron consultar los lugares cercanos (Overpass no respondió). Los tiempos a tus lugares fijos sí se calcularon.',
      };
    }
    publish();
  }

  // --- Bloque de rutas: una llamada por modo con TODOS los destinos ---------
  const destinations: Destination[] = [
    ...fixed.map((result) => ({
      position: fixedPlaces[fixed.indexOf(result)]!.position,
      straightLineKm: result.straightLineKm,
      apply: (mode: RoutableMode, travel: TravelByMode[RoutableMode]) => {
        result.travel[mode] = travel;
      },
    })),
    ...categoryResults.flatMap((category) =>
      category.nearest.map((place) => ({
        position: place.position,
        straightLineKm: place.straightLineKm,
        apply: (mode: RoutableMode, travel: TravelByMode[RoutableMode]) => {
          place.travel = { ...place.travel, [mode]: travel };
        },
      })),
    ),
  ];

  if (routing && destinations.length > 0) {
    const failedModes: string[] = [];
    let authFailed = false;

    for (const mode of ROUTABLE_MODES) {
      try {
        const travels = await routing.matrix(
          origin,
          destinations.map((destination) => destination.position),
          mode,
          signal,
        );
        travels.forEach((travel, index) => destinations[index]?.apply(mode, travel));
      } catch (error) {
        if (signal?.aborted) throw error;
        // Un modo que falla no tumba los demás: se estima y se avisa.
        if (isAuthError(error)) authFailed = true;
        failedModes.push(mode);
        destinations.forEach((destination) =>
          destination.apply(mode, estimateTravelFromKm(destination.straightLineKm, mode)),
        );
      }
      publish();
    }

    blocks.routing =
      authFailed
        ? {
            status: 'fallback',
            message:
              'El servicio de rutas rechazó la API key (VITE_ORS_API_KEY). Revisa que esté bien copiada y reinicia el servidor; mientras tanto los tiempos son estimados.',
          }
        : failedModes.length > 0
        ? {
            status: 'fallback',
            message: `El servicio de rutas no respondió para ${failedModes.length} de ${ROUTABLE_MODES.length} modos: esos tiempos son estimados.`,
          }
        : routing.estimated
          ? {
              status: 'fallback',
              message:
                'Sin API key de rutas: los tiempos son estimados a partir de la distancia en línea recta.',
            }
          : { status: 'ok' };
  } else if (!routing) {
    blocks.routing = { status: 'error', message: 'No hay proveedor de rutas configurado.' };
  }

  // --- Bloque de transporte público: sólo hacia los lugares fijos ----------
  if (transit && fixedPlaces.length > 0) {
    const departure = nextWeekdayDeparture(transitDepartureTime, now);
    let failures = 0;

    for (const [index, place] of fixedPlaces.entries()) {
      try {
        const journey = await transit.journey(origin, place.position, departure, signal);
        const result = fixed[index];
        if (result && journey) result.travel.transit = journey;
        else if (journey === null) failures += 1;
      } catch (error) {
        if (signal?.aborted) throw error;
        failures += 1;
      }
      publish();
    }

    blocks.transit =
      failures === 0
        ? { status: 'ok' }
        : failures === fixedPlaces.length
          ? {
              status: 'error',
              message:
                'No se pudo consultar el transporte público. Puede que la zona esté fuera de la cobertura de VBB (Berlín-Brandenburg).',
            }
          : {
              status: 'fallback',
              message: `Sin conexión de transporte público para ${failures} de ${fixedPlaces.length} lugares.`,
            };
  } else if (!transit) {
    blocks.transit = { status: 'error', message: 'No hay proveedor de transporte público.' };
  }

  // --- Reordenar el top 3 por tiempo real en el modo principal -------------
  categoryResults = categoryResults.map((category) => ({
    ...category,
    nearest: sortByTravelTime(category.nearest, primaryMode),
  }));
  publish();

  return { fixed, categories: categoryResults, blocks };
}

/** Ordena por tiempo real en el modo dado; sin tiempo, por distancia recta. */
export function sortByTravelTime(places: NearbyPlace[], mode: TravelMode): NearbyPlace[] {
  return [...places].sort((a, b) => {
    const aTime = a.travel?.[mode]?.durationMin;
    const bTime = b.travel?.[mode]?.durationMin;
    if (aTime !== undefined && bTime !== undefined) return aTime - bTime;
    if (aTime !== undefined) return -1;
    if (bTime !== undefined) return 1;
    return a.straightLineKm - b.straightLineKm;
  });
}

/** ¿Algún tiempo mostrado viene del fallback? Sirve para el aviso global. */
export function hasEstimatedTravel(results: FixedPlaceResult[]): boolean {
  return results.some((result) =>
    Object.values(result.travel).some((travel) => travel?.estimated === true),
  );
}
