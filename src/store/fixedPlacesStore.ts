import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_FIXED_PLACE_SCORING } from '@/lib/categories';
import { createId } from '@/lib/id';
import type { FixedPlace, LatLng, ScoringRule } from '@/types';
import { STORAGE_KEYS } from './keys';
import { fixedPlaceSchema, keepValid } from './schemas';
import { createPersistStorage } from './storage';

/** Datos mínimos para crear un lugar fijo; el resto toma valores por defecto. */
export interface NewFixedPlace {
  label: string;
  address?: string;
  position: LatLng;
  icon?: string;
  scoring?: Partial<ScoringRule>;
}

/** Sólo los datos se persisten; las acciones se recrean al arrancar. */
interface PersistedFixedPlaces {
  items: FixedPlace[];
}

export interface FixedPlacesState {
  items: FixedPlace[];
  add: (place: NewFixedPlace) => string;
  update: (id: string, patch: Partial<Omit<FixedPlace, 'id'>>) => void;
  updateScoring: (id: string, patch: Partial<ScoringRule>) => void;
  remove: (id: string) => void;
  /** Mueve un elemento (arrastrar y soltar, sección 8.5). */
  reorder: (fromIndex: number, toIndex: number) => void;
  replaceAll: (items: FixedPlace[]) => void;
  clear: () => void;
}

export const useFixedPlacesStore = create<FixedPlacesState>()(
  persist(
    (set) => ({
      items: [],

      add: ({ label, address = '', position, icon, scoring }) => {
        const id = createId('fp');
        const place: FixedPlace = {
          id,
          label,
          address,
          position,
          ...(icon ? { icon } : {}),
          scoring: { ...DEFAULT_FIXED_PLACE_SCORING, ...scoring },
        };
        set((state) => ({ items: [...state.items, place] }));
        return id;
      },

      update: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),

      updateScoring: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, scoring: { ...item.scoring, ...patch } } : item,
          ),
        })),

      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

      reorder: (fromIndex, toIndex) =>
        set((state) => {
          if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= state.items.length ||
            toIndex >= state.items.length
          ) {
            return state;
          }
          const items = [...state.items];
          const [moved] = items.splice(fromIndex, 1);
          if (moved) items.splice(toIndex, 0, moved);
          return { items };
        }),

      replaceAll: (items) => set({ items }),

      clear: () => set({ items: [] }),
    }),
    {
      name: STORAGE_KEYS.fixedPlaces,
      version: 1,
      storage: createPersistStorage<PersistedFixedPlaces>(),
      partialize: (state): PersistedFixedPlaces => ({ items: state.items }),
      merge: (persisted, current) => ({
        ...current,
        items: keepValid(fixedPlaceSchema, (persisted as { items?: unknown } | null)?.items),
      }),
    },
  ),
);
