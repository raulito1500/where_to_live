import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCandidatesStore, useFixedPlacesStore, type NewFixedPlace } from '@/store';
import type { FixedPlace, ScoringRule } from '@/types';

/**
 * Lugares fijos + la regla de la sección 8.5: al cambiarlos, los análisis
 * existentes quedan DESACTUALIZADOS. La coordinación entre stores vive aquí,
 * no en las stores (evita dependencias cruzadas) ni en los componentes.
 */
export function useFixedPlaces(): FixedPlace[] {
  return useFixedPlacesStore(useShallow((state) => state.items));
}

export function useFixedPlace(id: string | null | undefined): FixedPlace | undefined {
  return useFixedPlacesStore((state) => state.items.find((item) => item.id === id));
}

export function useFixedPlacesActions() {
  const { add, update, updateScoring, remove, reorder } = useFixedPlacesStore(
    useShallow((state) => ({
      add: state.add,
      update: state.update,
      updateScoring: state.updateScoring,
      remove: state.remove,
      reorder: state.reorder,
    })),
  );
  const markAllStale = useCandidatesStore((state) => state.markAllStale);

  const addPlace = useCallback(
    (place: NewFixedPlace) => {
      const id = add(place);
      markAllStale();
      return id;
    },
    [add, markAllStale],
  );

  const updatePlace = useCallback(
    (id: string, patch: Partial<Omit<FixedPlace, 'id'>>) => {
      update(id, patch);
      // Cambiar el peso o los umbrales no invalida el análisis: la puntuación se
      // recalcula sin red (7.1). Sólo mover el lugar obliga a recalcular.
      if (patch.position) markAllStale();
    },
    [update, markAllStale],
  );

  const removePlace = useCallback(
    (id: string) => {
      remove(id);
      markAllStale();
    },
    [remove, markAllStale],
  );

  const updatePlaceScoring = useCallback(
    (id: string, patch: Partial<ScoringRule>) => updateScoring(id, patch),
    [updateScoring],
  );

  return { addPlace, updatePlace, updatePlaceScoring, removePlace, reorder };
}
