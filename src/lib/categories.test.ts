import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES, defaultCategories } from './categories';

describe('categorías por defecto', () => {
  it('tiene ids únicos', () => {
    const ids = DEFAULT_CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cubre las 14 categorías de la spec', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(14);
  });

  it('usa pesos entre 0 y 5 y umbrales coherentes', () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.scoring.weight).toBeGreaterThanOrEqual(0);
      expect(category.scoring.weight).toBeLessThanOrEqual(5);
      if (category.kind === 'nearest') {
        // En 'nearest' son minutos: ideal < máximo.
        expect(category.scoring.idealMin).toBeLessThan(category.scoring.maxMin);
      } else {
        // En 'density' son conteos: ideal (100 pts) > mínimo (0 pts).
        expect(category.scoring.idealMin).toBeGreaterThan(category.scoring.maxMin);
      }
    }
  });

  it('define al menos un filtro OSM por categoría', () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.osmFilters.length).toBeGreaterThan(0);
      for (const filter of category.osmFilters) {
        expect(filter.startsWith('[')).toBe(true);
        expect(filter.endsWith(']')).toBe(true);
      }
    }
  });

  it('defaultCategories() devuelve copias independientes', () => {
    const first = defaultCategories();
    const second = defaultCategories();
    first[0]!.scoring.weight = 0;
    first[0]!.osmFilters.push('["x"="y"]');
    expect(second[0]!.scoring.weight).toBe(DEFAULT_CATEGORIES[0]!.scoring.weight);
    expect(DEFAULT_CATEGORIES[0]!.osmFilters).toHaveLength(1);
  });
});
