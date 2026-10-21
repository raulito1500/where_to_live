import { useQuery } from '@tanstack/react-query';
import { roundPosition } from '@/lib/geo';
import { providers } from '@/providers';
import type { GeocodeResult, LatLng } from '@/types';

/**
 * Dirección de un punto del mapa. Nominatim admite 1 req/s: la cola está en el
 * adaptador y react-query evita repetir la misma consulta.
 */
export function useReverseGeocode(position: LatLng | null) {
  const geocoding = providers.geocoding;
  const rounded = position ? roundPosition(position, 5) : null;

  const { data, isFetching, isError } = useQuery({
    queryKey: ['reverse', rounded?.lat, rounded?.lng],
    queryFn: ({ signal }) => geocoding!.reverse(position!, signal),
    enabled: geocoding !== undefined && position !== null,
    staleTime: 60 * 60 * 1000,
    retry: 0,
  });

  return {
    result: (data ?? null) as GeocodeResult | null,
    isLoading: isFetching,
    isError,
  };
}
