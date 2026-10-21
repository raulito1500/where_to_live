import { describe, expect, it } from 'vitest';
import type { CandidateAnalysis, FixedPlace, PlaceCategory, Settings } from '@/types';
import {
  computeScore,
  densityLevel,
  interpolateScore,
  scoreCount,
  scoreTime,
} from './scoring';

const rule = (weight: number, idealMin: number, maxMin: number) => ({ weight, idealMin, maxMin });

const place = (id: string, weight = 5): FixedPlace => ({
  id,
  label: `Lugar ${id}`,
  address: '',
  position: { lat: 52.39, lng: 13.06 },
  scoring: rule(weight, 15, 60),
});

const category = (overrides: Partial<PlaceCategory> & { id: string }): PlaceCategory => ({
  label: overrides.id,
  icon: 'MapPin',
  enabled: true,
  kind: 'nearest',
  radiusM: 2000,
  osmFilters: ['["shop"="supermarket"]'],
  scoring: rule(4, 5, 20),
  scoringMode: 'foot',
  ...overrides,
});

const settings = (categories: PlaceCategory[]): Pick<Settings, 'primaryMode' | 'categories'> => ({
  primaryMode: 'foot',
  categories,
});

const analysisWith = (overrides: Partial<CandidateAnalysis> = {}): CandidateAnalysis => ({
  computedAt: '2026-09-28T10:00:00Z',
  fixed: [],
  categories: [],
  ...overrides,
});

describe('interpolateScore', () => {
  it('da 100 en el mejor valor y 0 en el peor', () => {
    expect(interpolateScore(15, 15, 60)).toBe(100);
    expect(interpolateScore(60, 15, 60)).toBe(0);
  });

  it('interpola linealmente en medio', () => {
    expect(interpolateScore(37.5, 15, 60)).toBe(50);
  });

  it('recorta fuera del rango', () => {
    expect(interpolateScore(5, 15, 60)).toBe(100);
    expect(interpolateScore(120, 15, 60)).toBe(0);
  });

  it('si ideal y máximo coinciden, es todo o nada', () => {
    expect(interpolateScore(10, 10, 10)).toBe(100);
    expect(interpolateScore(11, 10, 10)).toBe(0);
  });
});

describe('scoreTime', () => {
  it('menos tiempo puntúa más', () => {
    const supermarket = rule(4, 5, 20);
    expect(scoreTime(3, supermarket)).toBe(100);
    expect(scoreTime(5, supermarket)).toBe(100);
    expect(scoreTime(12.5, supermarket)).toBe(50);
    expect(scoreTime(20, supermarket)).toBe(0);
    expect(scoreTime(45, supermarket)).toBe(0);
  });
});

describe('scoreCount', () => {
  it('más lugares puntúa más: 20 restaurantes = 100, 0 = 0', () => {
    const restaurants = rule(2, 20, 0);
    expect(scoreCount(20, restaurants)).toBe(100);
    expect(scoreCount(30, restaurants)).toBe(100);
    expect(scoreCount(10, restaurants)).toBe(50);
    expect(scoreCount(0, restaurants)).toBe(0);
  });
});

describe('computeScore', () => {
  it('sin análisis no hay puntuación', () => {
    expect(computeScore({ analysis: undefined, fixedPlaces: [], settings: settings([]) })).toBeNull();
  });

  it('promedia ponderando por peso', () => {
    const uni = place('uni', 5); // ideal 15, máx 60
    const gym = place('gym', 1);
    const analysis = analysisWith({
      fixed: [
        { fixedPlaceId: 'uni', straightLineKm: 1, travel: { foot: { mode: 'foot', durationMin: 15, estimated: false } } },
        { fixedPlaceId: 'gym', straightLineKm: 5, travel: { foot: { mode: 'foot', durationMin: 60, estimated: false } } },
      ],
    });

    // (100×5 + 0×1) / 6 = 83,3 => 83
    const score = computeScore({ analysis, fixedPlaces: [uni, gym], settings: settings([]) });
    expect(score?.total).toBe(83);
    expect(score?.partial).toBeUndefined();
  });

  it('ignora los elementos con peso 0', () => {
    const uni = place('uni', 5);
    const gym = place('gym', 0);
    const analysis = analysisWith({
      fixed: [
        { fixedPlaceId: 'uni', straightLineKm: 1, travel: { foot: { mode: 'foot', durationMin: 15, estimated: false } } },
        { fixedPlaceId: 'gym', straightLineKm: 5, travel: { foot: { mode: 'foot', durationMin: 60, estimated: false } } },
      ],
    });

    const score = computeScore({ analysis, fixedPlaces: [uni, gym], settings: settings([]) });
    expect(score?.total).toBe(100);
    expect(score?.breakdown.map((item) => item.itemId)).toEqual(['uni']);
  });

  it('usa el modo principal de Ajustes para los lugares fijos', () => {
    const uni = place('uni', 5);
    const analysis = analysisWith({
      fixed: [
        {
          fixedPlaceId: 'uni',
          straightLineKm: 4,
          travel: {
            foot: { mode: 'foot', durationMin: 60, estimated: false },
            bike: { mode: 'bike', durationMin: 15, estimated: false },
          },
        },
      ],
    });

    expect(computeScore({ analysis, fixedPlaces: [uni], settings: settings([]) })?.total).toBe(0);
    expect(
      computeScore({
        analysis,
        fixedPlaces: [uni],
        settings: { primaryMode: 'bike', categories: [] },
      })?.total,
    ).toBe(100);
  });

  it('una categoría sin nada en el radio puntúa 0, no se excluye', () => {
    const supermarket = category({ id: 'supermarket' });
    const analysis = analysisWith({
      categories: [{ categoryId: 'supermarket', nearest: [], radiusM: 2000 }],
    });

    const score = computeScore({ analysis, fixedPlaces: [], settings: settings([supermarket]) });
    expect(score?.total).toBe(0);
    expect(score?.partial).toBeUndefined();
    expect(score?.breakdown[0]?.score).toBe(0);
  });

  it('una categoría sin datos por error de red se excluye y marca parcial', () => {
    const supermarket = category({ id: 'supermarket' });
    const park = category({ id: 'park', scoring: rule(3, 8, 25) });
    const analysis = analysisWith({
      categories: [
        {
          categoryId: 'supermarket',
          nearest: [
            {
              osmId: 'n1',
              position: { lat: 52.39, lng: 13.06 },
              straightLineKm: 0.3,
              travel: { foot: { mode: 'foot', durationMin: 5, estimated: false } },
            },
          ],
          radiusM: 2000,
        },
        // 'park' no está: la consulta falló para esa categoría.
      ],
    });

    const score = computeScore({
      analysis,
      fixedPlaces: [],
      settings: settings([supermarket, park]),
    });
    expect(score?.total).toBe(100);
    expect(score?.partial).toBe(true);
    expect(score?.breakdown).toHaveLength(1);
  });

  it('puntúa las categorías de densidad por conteo', () => {
    const restaurants = category({
      id: 'restaurants',
      kind: 'density',
      radiusM: 600,
      scoring: rule(2, 20, 0),
    });
    const analysis = analysisWith({
      categories: [{ categoryId: 'restaurants', nearest: [], countInRadius: 10, radiusM: 600 }],
    });

    expect(
      computeScore({ analysis, fixedPlaces: [], settings: settings([restaurants]) })?.total,
    ).toBe(50);
  });

  it('ignora las categorías desactivadas', () => {
    const off = category({ id: 'mall', enabled: false });
    const analysis = analysisWith({
      categories: [{ categoryId: 'mall', nearest: [], radiusM: 6000 }],
    });

    const score = computeScore({ analysis, fixedPlaces: [], settings: settings([off]) });
    expect(score?.breakdown).toHaveLength(0);
  });

  it('usa el scoringMode propio de cada categoría', () => {
    const gym = category({ id: 'gym', scoringMode: 'bike', scoring: rule(2, 10, 30) });
    const analysis = analysisWith({
      categories: [
        {
          categoryId: 'gym',
          nearest: [
            {
              osmId: 'n1',
              position: { lat: 52.39, lng: 13.06 },
              straightLineKm: 2,
              travel: {
                foot: { mode: 'foot', durationMin: 30, estimated: false },
                bike: { mode: 'bike', durationMin: 10, estimated: false },
              },
            },
          ],
          radiusM: 3000,
        },
      ],
    });

    expect(computeScore({ analysis, fixedPlaces: [], settings: settings([gym]) })?.total).toBe(100);
  });

  it('el desglose ordena por aporte al total', () => {
    const uni = place('uni', 5);
    const gym = place('gym', 1);
    const analysis = analysisWith({
      fixed: [
        { fixedPlaceId: 'uni', straightLineKm: 1, travel: { foot: { mode: 'foot', durationMin: 15, estimated: false } } },
        { fixedPlaceId: 'gym', straightLineKm: 1, travel: { foot: { mode: 'foot', durationMin: 15, estimated: false } } },
      ],
    });

    const score = computeScore({ analysis, fixedPlaces: [uni, gym], settings: settings([]) });
    expect(score?.breakdown.map((item) => item.itemId)).toEqual(['uni', 'gym']);
  });

  it('sin ningún elemento puntuable devuelve 0', () => {
    const score = computeScore({ analysis: analysisWith(), fixedPlaces: [], settings: settings([]) });
    expect(score?.total).toBe(0);
    expect(score?.breakdown).toHaveLength(0);
  });

  it('es determinista: mismos datos, mismo resultado', () => {
    const uni = place('uni', 3);
    const analysis = analysisWith({
      fixed: [
        { fixedPlaceId: 'uni', straightLineKm: 2, travel: { foot: { mode: 'foot', durationMin: 30, estimated: false } } },
      ],
    });
    const input = { analysis, fixedPlaces: [uni], settings: settings([]) };
    expect(computeScore(input)).toEqual(computeScore(input));
  });
});

describe('densityLevel', () => {
  it('aplica los umbrales por defecto: <5 bajo, 5-20 medio, >20 alto', () => {
    const thresholds = { low: 5, high: 20 };
    expect(densityLevel(3, thresholds)).toBe('low');
    expect(densityLevel(5, thresholds)).toBe('medium');
    expect(densityLevel(20, thresholds)).toBe('medium');
    expect(densityLevel(23, thresholds)).toBe('high');
  });
});
