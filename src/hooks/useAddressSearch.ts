import { useQuery } from '@tanstack/react-query';
import { providers } from '@/providers';
import type { GeocodeResult, LatLng } from '@/types';
import { useDebouncedValue } from './useDebouncedValue';

export const ADDRESS_SEARCH_DEBOUNCE_MS = 400;
export const MIN_QUERY_LENGTH = 3;

export interface UseAddressSearchResult {
  results: GeocodeResult[];
  isLoading: boolean;
  isError: boolean;
  /** true mientras el debounce aún no ha disparado la consulta. */
  isTyping: boolean;
  available: boolean;
}

/**
 * Autocompletado de direcciones (sección 8.7). Toda la red vive aquí: el
 * componente `AddressSearch` sólo recibe resultados por props.
 */
export function useAddressSearch(query: string, bias?: LatLng): UseAddressSearchResult {
  const debouncedQuery = useDebouncedValue(query, ADDRESS_SEARCH_DEBOUNCE_MS);
  const geocoding = providers.geocoding;
  const trimmed = debouncedQuery.trim();
  const enabled = geocoding !== undefined && trimmed.length >= MIN_QUERY_LENGTH;

  const { data, isFetching, isError } = useQuery({
    // El sesgo se redondea para no invalidar la caché al mover el mapa un píxel.
    queryKey: [
      'geocode',
      trimmed,
      bias ? `${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}` : 'no-bias',
    ],
    queryFn: ({ signal }) => geocoding!.search(trimmed, bias, signal),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  return {
    results: data ?? [],
    isLoading: enabled && isFetching,
    isError,
    isTyping: query.trim() !== trimmed && query.trim().length >= MIN_QUERY_LENGTH,
    available: geocoding !== undefined,
  };
}
