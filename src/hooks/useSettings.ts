import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '@/store';
import type { PlaceCategory, Settings } from '@/types';

/**
 * Acceso a Ajustes para la UI. Los componentes no importan la store directamente
 * (sección 3): así se puede cambiar la implementación de estado sin tocarlos.
 */
export function useSettings(): Settings {
  return useSettingsStore(
    useShallow((state) => ({
      primaryMode: state.primaryMode,
      transitDepartureTime: state.transitDepartureTime,
      categories: state.categories,
      densityThresholds: state.densityThresholds,
    })),
  );
}

export function usePrimaryMode() {
  return useSettingsStore((state) => state.primaryMode);
}

/** Categorías activas: las únicas que se consultan en un análisis (sección 7). */
export function useEnabledCategories(): PlaceCategory[] {
  return useSettingsStore(useShallow((state) => state.categories.filter((c) => c.enabled)));
}

export function useSettingsActions() {
  return useSettingsStore(
    useShallow((state) => ({
      setPrimaryMode: state.setPrimaryMode,
      setTransitDepartureTime: state.setTransitDepartureTime,
      setDensityThresholds: state.setDensityThresholds,
      toggleCategory: state.toggleCategory,
      updateCategory: state.updateCategory,
      updateCategoryScoring: state.updateCategoryScoring,
      addCategory: state.addCategory,
      removeCategory: state.removeCategory,
      resetCategories: state.resetCategories,
      resetAll: state.resetAll,
    })),
  );
}
