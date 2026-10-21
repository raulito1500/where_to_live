import { QueryClient } from '@tanstack/react-query';

/**
 * Caché de datos remotos. Los servicios gratuitos tienen límites estrictos
 * (sección 12), así que se evita revalidar de más.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
