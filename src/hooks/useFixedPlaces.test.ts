import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCandidatesStore, useFixedPlacesStore } from '@/store';
import { useFixedPlaces, useFixedPlacesActions } from './useFixedPlaces';

const potsdam = { lat: 52.3906, lng: 13.0645 };
const berlin = { lat: 52.52, lng: 13.405 };

function addAnalyzedCandidate(): string {
  const id = useCandidatesStore.getState().add({ name: 'Apto', position: potsdam });
  useCandidatesStore.getState().setAnalysis(id, {
    computedAt: new Date().toISOString(),
    fixed: [],
    categories: [],
  });
  return id;
}

const staleOf = (id: string) =>
  useCandidatesStore.getState().items.find((item) => item.id === id)?.stale;

beforeEach(() => {
  localStorage.clear();
  useCandidatesStore.getState().clear();
  useFixedPlacesStore.getState().clear();
});

describe('useFixedPlacesActions', () => {
  it('marca los análisis como desactualizados al agregar un lugar fijo', () => {
    const candidateId = addAnalyzedCandidate();
    const { result } = renderHook(() => useFixedPlacesActions());

    act(() => {
      result.current.addPlace({ label: 'Universidad', position: potsdam });
    });

    expect(staleOf(candidateId)).toBe(true);
  });

  it('los desactualiza al mover un lugar fijo, pero no al cambiar su nombre', () => {
    const { result } = renderHook(() => useFixedPlacesActions());
    let placeId = '';
    act(() => {
      placeId = result.current.addPlace({ label: 'Universidad', position: potsdam });
    });

    const candidateId = addAnalyzedCandidate();
    expect(staleOf(candidateId)).toBe(false);

    act(() => {
      result.current.updatePlace(placeId, { label: 'Uni Potsdam' });
    });
    expect(staleOf(candidateId)).toBe(false);

    act(() => {
      result.current.updatePlace(placeId, { position: berlin });
    });
    expect(staleOf(candidateId)).toBe(true);
  });

  it('cambiar el peso NO desactualiza: la puntuación se recalcula sin red (7.1)', () => {
    const { result } = renderHook(() => useFixedPlacesActions());
    let placeId = '';
    act(() => {
      placeId = result.current.addPlace({ label: 'Trabajo', position: potsdam });
    });
    const candidateId = addAnalyzedCandidate();

    act(() => {
      result.current.updatePlaceScoring(placeId, { weight: 2 });
    });

    expect(staleOf(candidateId)).toBe(false);
    expect(useFixedPlacesStore.getState().items[0]?.scoring.weight).toBe(2);
  });

  it('los desactualiza al eliminar un lugar fijo', () => {
    const { result } = renderHook(() => useFixedPlacesActions());
    let placeId = '';
    act(() => {
      placeId = result.current.addPlace({ label: 'Trabajo', position: potsdam });
    });
    const candidateId = addAnalyzedCandidate();

    act(() => {
      result.current.removePlace(placeId);
    });

    expect(staleOf(candidateId)).toBe(true);
    expect(useFixedPlacesStore.getState().items).toHaveLength(0);
  });

  it('useFixedPlaces refleja los cambios de la store', () => {
    const { result: list } = renderHook(() => useFixedPlaces());
    const { result: actions } = renderHook(() => useFixedPlacesActions());

    expect(list.current).toHaveLength(0);
    act(() => {
      actions.current.addPlace({ label: 'Universidad', position: potsdam });
    });
    expect(list.current).toHaveLength(1);
    expect(list.current[0]?.label).toBe('Universidad');
  });
});
