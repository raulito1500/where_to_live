import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { useCandidatesStore } from './candidatesStore';
import { useFixedPlacesStore } from './fixedPlacesStore';
import { useSettingsStore } from './settingsStore';
import { STORAGE_KEYS } from './keys';

const potsdam = { lat: 52.3906, lng: 13.0645 };

beforeEach(() => {
  localStorage.clear();
  useCandidatesStore.getState().clear();
  useFixedPlacesStore.getState().clear();
  useSettingsStore.getState().resetAll();
});

describe('fixedPlacesStore', () => {
  it('agrega con los valores de puntuación por defecto', () => {
    const id = useFixedPlacesStore.getState().add({ label: 'Universidad', position: potsdam });
    const place = useFixedPlacesStore.getState().items.find((item) => item.id === id);
    expect(place?.label).toBe('Universidad');
    expect(place?.scoring).toEqual({ weight: 5, idealMin: 15, maxMin: 60 });
  });

  it('actualiza, reordena y elimina', () => {
    const store = useFixedPlacesStore.getState();
    const first = store.add({ label: 'Trabajo', position: potsdam });
    store.add({ label: 'Gym', position: potsdam });
    useFixedPlacesStore.getState().update(first, { label: 'Trabajo de Ana' });
    expect(useFixedPlacesStore.getState().items[0]?.label).toBe('Trabajo de Ana');

    useFixedPlacesStore.getState().reorder(0, 1);
    expect(useFixedPlacesStore.getState().items[1]?.label).toBe('Trabajo de Ana');

    useFixedPlacesStore.getState().remove(first);
    expect(useFixedPlacesStore.getState().items).toHaveLength(1);
  });

  it('ignora un reorder con índices fuera de rango', () => {
    useFixedPlacesStore.getState().add({ label: 'Uni', position: potsdam });
    useFixedPlacesStore.getState().reorder(0, 5);
    expect(useFixedPlacesStore.getState().items).toHaveLength(1);
  });

  it('persiste en la clave versionada de la spec', () => {
    useFixedPlacesStore.getState().add({ label: 'Universidad', position: potsdam });
    const raw = localStorage.getItem(STORAGE_KEYS.fixedPlaces);
    expect(raw).toContain('Universidad');
    expect(STORAGE_KEYS.fixedPlaces).toBe('wtl:v1:fixedPlaces');
  });
});

describe('candidatesStore', () => {
  it('marca el nuevo candidato como activo y lo pone primero', () => {
    const first = useCandidatesStore.getState().add({ name: 'Apto A', position: potsdam });
    const second = useCandidatesStore.getState().add({ name: 'Apto B', position: potsdam });
    expect(useCandidatesStore.getState().activeId).toBe(second);
    expect(useCandidatesStore.getState().items[0]?.id).toBe(second);
    expect(useCandidatesStore.getState().items[1]?.id).toBe(first);
  });

  it('al eliminar el activo pasa el foco a otro', () => {
    const first = useCandidatesStore.getState().add({ name: 'Apto A', position: potsdam });
    const second = useCandidatesStore.getState().add({ name: 'Apto B', position: potsdam });
    useCandidatesStore.getState().remove(second);
    expect(useCandidatesStore.getState().activeId).toBe(first);
  });

  it('duplica con nombre marcado y nuevo id', () => {
    const id = useCandidatesStore.getState().add({ name: 'Apto A', position: potsdam });
    const copyId = useCandidatesStore.getState().duplicate(id);
    expect(copyId).not.toBe(id);
    expect(useCandidatesStore.getState().items[0]?.name).toBe('Apto A (copia)');
  });

  it('markAllStale sólo afecta a los que ya tienen análisis', () => {
    const withAnalysis = useCandidatesStore.getState().add({ name: 'Con análisis', position: potsdam });
    const withoutAnalysis = useCandidatesStore.getState().add({ name: 'Sin análisis', position: potsdam });
    useCandidatesStore.getState().setAnalysis(withAnalysis, {
      computedAt: new Date().toISOString(),
      fixed: [],
      categories: [],
    });
    useCandidatesStore.getState().markAllStale();
    const items = useCandidatesStore.getState().items;
    expect(items.find((item) => item.id === withAnalysis)?.stale).toBe(true);
    expect(items.find((item) => item.id === withoutAnalysis)?.stale).toBeUndefined();
  });

  it('setAnalysis limpia la marca de desactualizado', () => {
    const id = useCandidatesStore.getState().add({ name: 'Apto', position: potsdam });
    useCandidatesStore.getState().setAnalysis(id, {
      computedAt: new Date().toISOString(),
      fixed: [],
      categories: [],
    });
    useCandidatesStore.getState().markStale(id);
    expect(useCandidatesStore.getState().items[0]?.stale).toBe(true);
    useCandidatesStore.getState().setAnalysis(id, {
      computedAt: new Date().toISOString(),
      fixed: [],
      categories: [],
    });
    expect(useCandidatesStore.getState().items[0]?.stale).toBe(false);
  });

  it('limita la selección de Comparar a 4', () => {
    const ids = Array.from({ length: 5 }, (_, index) =>
      useCandidatesStore.getState().add({ name: `Apto ${index}`, position: potsdam }),
    );
    for (const id of ids) useCandidatesStore.getState().toggleCompare(id);
    expect(useCandidatesStore.getState().compareIds).toHaveLength(4);

    useCandidatesStore.getState().toggleCompare(ids[0]!);
    expect(useCandidatesStore.getState().compareIds).toHaveLength(3);
  });
});

describe('settingsStore', () => {
  it('arranca con las categorías por defecto', () => {
    expect(useSettingsStore.getState().categories).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(useSettingsStore.getState().primaryMode).toBe('foot');
  });

  it('activa/desactiva y edita una categoría', () => {
    useSettingsStore.getState().toggleCategory('supermarket');
    expect(useSettingsStore.getState().categories.find((c) => c.id === 'supermarket')?.enabled).toBe(false);

    useSettingsStore.getState().updateCategory('supermarket', { radiusM: 1200 });
    expect(useSettingsStore.getState().categories.find((c) => c.id === 'supermarket')?.radiusM).toBe(1200);

    useSettingsStore.getState().updateCategoryScoring('supermarket', { weight: 1 });
    expect(useSettingsStore.getState().categories.find((c) => c.id === 'supermarket')?.scoring.weight).toBe(1);
  });

  it('resetCategories restaura las de la spec y conserva las propias', () => {
    const customId = useSettingsStore.getState().addCategory({
      label: 'Escuela de música',
      icon: 'MapPin',
      enabled: true,
      kind: 'nearest',
      radiusM: 3000,
      osmFilters: ['["amenity"="music_school"]'],
      scoring: { weight: 3, idealMin: 10, maxMin: 30 },
      scoringMode: 'bike',
    });
    useSettingsStore.getState().updateCategory('supermarket', { radiusM: 100 });

    useSettingsStore.getState().resetCategories();
    const categories = useSettingsStore.getState().categories;
    expect(categories.find((c) => c.id === 'supermarket')?.radiusM).toBe(2000);
    expect(categories.find((c) => c.id === customId)?.label).toBe('Escuela de música');
  });
});
