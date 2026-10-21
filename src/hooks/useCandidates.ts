import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCandidatesStore } from '@/store';
import type { Candidate, CandidateScore } from '@/types';

export type CandidateSort = 'score' | 'createdAt' | 'name';

export function useCandidates(): Candidate[] {
  return useCandidatesStore(useShallow((state) => state.items));
}

export function useActiveCandidate(): Candidate | null {
  return useCandidatesStore(
    (state) => state.items.find((item) => item.id === state.activeId) ?? null,
  );
}

export function useCompareSelection(): Candidate[] {
  return useCandidatesStore(
    useShallow((state) =>
      state.compareIds
        .map((id) => state.items.find((item) => item.id === id))
        .filter((item): item is Candidate => item !== undefined),
    ),
  );
}

export function useCandidatesActions() {
  return useCandidatesStore(
    useShallow((state) => ({
      add: state.add,
      update: state.update,
      remove: state.remove,
      duplicate: state.duplicate,
      setActive: state.setActive,
      setAnalysis: state.setAnalysis,
      markStale: state.markStale,
      toggleCompare: state.toggleCompare,
      clearCompare: state.clearCompare,
    })),
  );
}

/**
 * Orden de la lista de candidatos (sección 8.3). Las puntuaciones se pasan
 * desde fuera porque son derivadas (ver `useCandidateScore`), no guardadas.
 */
export function sortCandidates(
  items: Candidate[],
  sort: CandidateSort,
  scores: Record<string, CandidateScore | null> = {},
): Candidate[] {
  const copy = [...items];
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    case 'score':
      return copy.sort((a, b) => (scores[b.id]?.total ?? -1) - (scores[a.id]?.total ?? -1));
    case 'createdAt':
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function useSortedCandidates(
  sort: CandidateSort,
  scores: Record<string, CandidateScore | null> = {},
): Candidate[] {
  const items = useCandidates();
  return useMemo(() => sortCandidates(items, sort, scores), [items, sort, scores]);
}
