import { useQuery } from '@tanstack/react-query';
import { roundPosition } from '@/lib/geo';
import { providers } from '@/providers';
import type { LatLng, RoutableMode } from '@/types';

export interface UseRouteTarget {
  origin: LatLng;
  destination: LatLng;
  mode: RoutableMode;
}

/**
 * Trazado de una ruta concreta para dibujarla en el mapa (sección 8.1).
 * Sólo se pide cuando el usuario selecciona un lugar, no durante el análisis.
 */
export function useRoute(target: UseRouteTarget | null) {
  const routing = providers.routing;
  const canRoute = routing?.route !== undefined;
  const origin = target ? roundPosition(target.origin, 5) : null;
  const destination = target ? roundPosition(target.destination, 5) : null;

  const { data, isFetching, isError } = useQuery({
    queryKey: [
      'route',
      origin ? `${origin.lat},${origin.lng}` : null,
      destination ? `${destination.lat},${destination.lng}` : null,
      target?.mode,
    ],
    queryFn: ({ signal }) =>
      routing!.route!(target!.origin, target!.destination, target!.mode, signal),
    enabled: target !== null && canRoute,
    staleTime: 60 * 60 * 1000,
    retry: 0,
  });

  return {
    points: data?.points ?? null,
    travel: data?.travel ?? null,
    isLoading: isFetching,
    isError,
    /** false sin API key: se puede seguir usando la app, sólo sin trazado. */
    available: canRoute,
  };
}
