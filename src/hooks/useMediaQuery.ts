import { useCallback, useSyncExternalStore } from 'react';

/**
 * Media query como estado de React. Sirve para elegir el layout de verdad (una
 * sola rama en el DOM) en vez de renderizar el panel dos veces y ocultar uno con
 * CSS: eso duplicaría los `id` de las pestañas y rompería `aria-controls`.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Breakpoint `lg` de Tailwind: a partir de aquí, mapa + panel lateral. */
export const DESKTOP_QUERY = '(min-width: 64rem)';

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
