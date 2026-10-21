import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaceCategory } from '@/types';
import { CACHE_TTL_MS, cacheKey, createOverpassCache } from './overpassCache';
import { STORAGE_KEYS } from './keys';

const origin = { lat: 52.390612, lng: 13.064509 };

const category: PlaceCategory = {
  id: 'supermarket',
  label: 'Supermercado',
  icon: 'ShoppingCart',
  enabled: true,
  kind: 'nearest',
  radiusM: 2000,
  osmFilters: ['["shop"="supermarket"]'],
  scoring: { weight: 4, idealMin: 5, maxMin: 20 },
  scoringMode: 'foot',
};

const place = { osmId: 'node1', position: origin, straightLineKm: 0.2 };

beforeEach(() => {
  localStorage.clear();
});

describe('cacheKey', () => {
  it('redondea a 4 decimales: mover unos metros reusa la caché', () => {
    expect(cacheKey(origin, category)).toBe('52.3906,13.0645|supermarket|2000');
    expect(cacheKey({ lat: 52.39062, lng: 13.06451 }, category)).toBe(cacheKey(origin, category));
  });

  it('cambia con la categoría y con el radio', () => {
    expect(cacheKey(origin, { ...category, radiusM: 1000 })).not.toBe(cacheKey(origin, category));
    expect(cacheKey(origin, { ...category, id: 'park' })).not.toBe(cacheKey(origin, category));
  });
});

describe('createOverpassCache', () => {
  it('guarda y devuelve lo cacheado', () => {
    const cache = createOverpassCache();
    expect(cache.get(origin, category)).toBeNull();

    cache.set(origin, category, [place]);
    expect(cache.get(origin, category)).toEqual([place]);
    expect(localStorage.getItem(STORAGE_KEYS.overpassCache)).toContain('supermarket');
  });

  it('caduca a los 7 días', () => {
    vi.useFakeTimers();
    try {
      const cache = createOverpassCache();
      cache.set(origin, category, [place]);

      vi.advanceTimersByTime(CACHE_TTL_MS - 1000);
      expect(cache.get(origin, category)).toEqual([place]);

      vi.advanceTimersByTime(2000);
      expect(cache.get(origin, category)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('poda las entradas caducadas al escribir', () => {
    vi.useFakeTimers();
    try {
      const cache = createOverpassCache();
      cache.set(origin, category, [place]);

      vi.advanceTimersByTime(CACHE_TTL_MS + 1000);
      cache.set({ lat: 0, lng: 0 }, category, [place]);

      const raw = localStorage.getItem(STORAGE_KEYS.overpassCache) ?? '{}';
      expect(Object.keys(JSON.parse(raw))).toEqual(['0,0|supermarket|2000']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clear vacía la caché', () => {
    const cache = createOverpassCache();
    cache.set(origin, category, [place]);
    cache.clear();
    expect(cache.get(origin, category)).toBeNull();
  });

  it('sobrevive a un localStorage corrupto', () => {
    localStorage.setItem(STORAGE_KEYS.overpassCache, 'no-es-json');
    const cache = createOverpassCache();
    expect(cache.get(origin, category)).toBeNull();
    cache.set(origin, category, [place]);
    expect(cache.get(origin, category)).toEqual([place]);
  });
});
