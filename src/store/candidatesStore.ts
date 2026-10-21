import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createId } from '@/lib/id';
import type { Candidate, CandidateAnalysis, LatLng } from '@/types';
import { STORAGE_KEYS } from './keys';
import { candidateSchema, keepValid } from './schemas';
import { createPersistStorage } from './storage';

export interface NewCandidate {
  name: string;
  address?: string;
  position: LatLng;
  notes?: string;
  listingUrl?: string;
}

/** La selección de Comparar no se persiste: es efímera por sesión. */
interface PersistedCandidates {
  items: Candidate[];
  activeId: string | null;
}

export interface CandidatesState {
  items: Candidate[];
  /** Candidato mostrado en el panel; `null` si no hay ninguno. */
  activeId: string | null;
  /** Selección para la vista Comparar (2–4 candidatos, sección 8.3). */
  compareIds: string[];

  add: (candidate: NewCandidate) => string;
  update: (id: string, patch: Partial<Omit<Candidate, 'id' | 'createdAt'>>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => string | null;
  setActive: (id: string | null) => void;
  setAnalysis: (id: string, analysis: CandidateAnalysis) => void;
  /** Marca análisis desactualizados (cambió un lugar fijo o un ajuste, 8.5). */
  markStale: (id: string) => void;
  markAllStale: () => void;
  toggleCompare: (id: string, max?: number) => void;
  clearCompare: () => void;
  replaceAll: (items: Candidate[]) => void;
  clear: () => void;
}

const MAX_COMPARE = 4;

export const useCandidatesStore = create<CandidatesState>()(
  persist(
    (set, get) => ({
      items: [],
      activeId: null,
      compareIds: [],

      add: ({ name, address = '', position, notes, listingUrl }) => {
        const id = createId('cand');
        const candidate: Candidate = {
          id,
          name,
          address,
          position,
          ...(notes ? { notes } : {}),
          ...(listingUrl ? { listingUrl } : {}),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ items: [candidate, ...state.items], activeId: id }));
        return id;
      },

      update: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),

      remove: (id) =>
        set((state) => {
          const items = state.items.filter((item) => item.id !== id);
          return {
            items,
            activeId: state.activeId === id ? (items[0]?.id ?? null) : state.activeId,
            compareIds: state.compareIds.filter((compareId) => compareId !== id),
          };
        }),

      duplicate: (id) => {
        const source = get().items.find((item) => item.id === id);
        if (!source) return null;
        const copyId = createId('cand');
        const copy: Candidate = {
          ...source,
          id: copyId,
          name: `${source.name} (copia)`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ items: [copy, ...state.items], activeId: copyId }));
        return copyId;
      },

      setActive: (id) => set({ activeId: id }),

      setAnalysis: (id, analysis) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, analysis, stale: false } : item,
          ),
        })),

      markStale: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && item.analysis ? { ...item, stale: true } : item,
          ),
        })),

      markAllStale: () =>
        set((state) => ({
          items: state.items.map((item) => (item.analysis ? { ...item, stale: true } : item)),
        })),

      toggleCompare: (id, max = MAX_COMPARE) =>
        set((state) => {
          if (state.compareIds.includes(id)) {
            return { compareIds: state.compareIds.filter((compareId) => compareId !== id) };
          }
          if (state.compareIds.length >= max) return state;
          return { compareIds: [...state.compareIds, id] };
        }),

      clearCompare: () => set({ compareIds: [] }),

      replaceAll: (items) =>
        set({ items, activeId: items[0]?.id ?? null, compareIds: [] }),

      clear: () => set({ items: [], activeId: null, compareIds: [] }),
    }),
    {
      name: STORAGE_KEYS.candidates,
      version: 1,
      storage: createPersistStorage<PersistedCandidates>(),
      partialize: (state): PersistedCandidates => ({
        items: state.items,
        activeId: state.activeId,
      }),
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as { items?: unknown; activeId?: unknown };
        const items = keepValid(candidateSchema, raw.items);
        const activeId =
          typeof raw.activeId === 'string' && items.some((item) => item.id === raw.activeId)
            ? raw.activeId
            : (items[0]?.id ?? null);
        return { ...current, items, activeId, compareIds: [] };
      },
    },
  ),
);
