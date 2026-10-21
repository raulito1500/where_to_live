import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_DENSITY_THRESHOLDS,
  DEFAULT_PRIMARY_MODE,
  DEFAULT_TRANSIT_DEPARTURE_TIME,
  defaultCategories,
} from '@/lib/categories';
import { createId } from '@/lib/id';
import type { PlaceCategory, ScoringRule, Settings, TravelMode } from '@/types';
import { STORAGE_KEYS } from './keys';
import { keepValid, placeCategorySchema, settingsSchema } from './schemas';
import { createPersistStorage } from './storage';

/**
 * Ajustes de la app (sección 8.6). Capa funcional: sólo estado + acciones, sin
 * nada de React ni de red. Los componentes la consumen vía `hooks/useSettings`.
 */
export interface SettingsState extends Settings {
  setPrimaryMode: (mode: TravelMode) => void;
  setTransitDepartureTime: (time: string) => void;
  setDensityThresholds: (thresholds: { low: number; high: number }) => void;
  toggleCategory: (categoryId: string, enabled?: boolean) => void;
  updateCategory: (categoryId: string, patch: Partial<Omit<PlaceCategory, 'id'>>) => void;
  updateCategoryScoring: (categoryId: string, patch: Partial<ScoringRule>) => void;
  addCategory: (category: Omit<PlaceCategory, 'id' | 'custom'>) => string;
  removeCategory: (categoryId: string) => void;
  resetCategories: () => void;
  resetAll: () => void;
}

const initialSettings: Settings = {
  primaryMode: DEFAULT_PRIMARY_MODE,
  transitDepartureTime: DEFAULT_TRANSIT_DEPARTURE_TIME,
  categories: defaultCategories(),
  densityThresholds: { ...DEFAULT_DENSITY_THRESHOLDS },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialSettings,

      setPrimaryMode: (mode) => set({ primaryMode: mode }),

      setTransitDepartureTime: (time) => set({ transitDepartureTime: time }),

      setDensityThresholds: (thresholds) => set({ densityThresholds: thresholds }),

      toggleCategory: (categoryId, enabled) =>
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === categoryId
              ? { ...category, enabled: enabled ?? !category.enabled }
              : category,
          ),
        })),

      updateCategory: (categoryId, patch) =>
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === categoryId ? { ...category, ...patch } : category,
          ),
        })),

      updateCategoryScoring: (categoryId, patch) =>
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === categoryId
              ? { ...category, scoring: { ...category.scoring, ...patch } }
              : category,
          ),
        })),

      addCategory: (category) => {
        const id = createId('cat');
        set((state) => ({ categories: [...state.categories, { ...category, id, custom: true }] }));
        return id;
      },

      removeCategory: (categoryId) =>
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== categoryId),
        })),

      /** Restaura las por defecto y conserva las creadas por el usuario. */
      resetCategories: () =>
        set({ categories: [...defaultCategories(), ...get().categories.filter((c) => c.custom)] }),

      resetAll: () =>
        set({
          primaryMode: initialSettings.primaryMode,
          transitDepartureTime: initialSettings.transitDepartureTime,
          categories: defaultCategories(),
          densityThresholds: { ...DEFAULT_DENSITY_THRESHOLDS },
        }),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: 1,
      storage: createPersistStorage<Settings>(),
      partialize: (state): Settings => ({
        primaryMode: state.primaryMode,
        transitDepartureTime: state.transitDepartureTime,
        categories: state.categories,
        densityThresholds: state.densityThresholds,
      }),
      /** Se valida lo leído: si está corrupto se cae a los valores por defecto. */
      merge: (persisted, current) => {
        const parsed = settingsSchema.safeParse(persisted);
        if (parsed.success) return { ...current, ...parsed.data };
        const partial = (persisted ?? {}) as Partial<Settings>;
        const categories = keepValid(placeCategorySchema, partial.categories);
        return {
          ...current,
          categories: categories.length > 0 ? categories : defaultCategories(),
        };
      },
    },
  ),
);
