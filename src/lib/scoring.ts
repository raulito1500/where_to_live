import type {
  CandidateAnalysis,
  CandidateScore,
  CategoryResult,
  FixedPlace,
  PlaceCategory,
  ScoreBreakdownItem,
  ScoringRule,
  Settings,
  TravelMode,
} from '@/types';

/**
 * Puntuación ponderada (sección 7.1). Función pura, sin React ni red: al
 * cambiar pesos o umbrales se recalcula al instante con el análisis que ya
 * está guardado, sin volver a consultar ninguna API.
 */

const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value));

/**
 * Interpolación lineal entre el valor que vale 100 (`best`) y el que vale 0
 * (`worst`). Sirve igual para tiempos (menos es mejor: best < worst) que para
 * conteos (más es mejor: best > worst).
 */
export function interpolateScore(value: number, best: number, worst: number): number {
  if (best === worst) return value === best ? 100 : 0;
  return clamp(((value - worst) / (best - worst)) * 100);
}

/** Puntaje de un tiempo de viaje: <= idealMin => 100, >= maxMin => 0. */
export function scoreTime(minutes: number, rule: ScoringRule): number {
  return interpolateScore(minutes, rule.idealMin, rule.maxMin);
}

/**
 * Puntaje de una categoría `density`: `idealMin` se reinterpreta como conteo
 * ideal (100 puntos) y `maxMin` como conteo mínimo (0 puntos).
 */
export function scoreCount(count: number, rule: ScoringRule): number {
  return interpolateScore(count, rule.idealMin, rule.maxMin);
}

export interface ScoreInput {
  analysis: CandidateAnalysis | undefined;
  fixedPlaces: FixedPlace[];
  settings: Pick<Settings, 'primaryMode' | 'categories'>;
}

interface ScorableItem {
  itemId: string;
  label: string;
  weight: number;
  /** `null` = sin datos: se excluye y la puntuación queda parcial. */
  score: number | null;
}

function scoreFixedPlace(
  place: FixedPlace,
  analysis: CandidateAnalysis,
  primaryMode: TravelMode,
): ScorableItem {
  const result = analysis.fixed.find((item) => item.fixedPlaceId === place.id);
  const minutes = result?.travel[primaryMode]?.durationMin;
  return {
    itemId: place.id,
    label: place.label,
    weight: place.scoring.weight,
    score: minutes === undefined ? null : scoreTime(minutes, place.scoring),
  };
}

function scoreCategory(category: PlaceCategory, result: CategoryResult | undefined): ScorableItem {
  const base = { itemId: category.id, label: category.label, weight: category.scoring.weight };

  // Sin resultado no hubo datos (falló la consulta): se excluye.
  if (!result) return { ...base, score: null };

  if (category.kind === 'density') {
    const count = result.countInRadius;
    return { ...base, score: count === undefined ? null : scoreCount(count, category.scoring) };
  }

  // Nada en el radio puntúa 0: es información, no falta de datos (sección 7.1).
  const nearest = result.nearest[0];
  if (!nearest) return { ...base, score: 0 };

  const minutes = nearest.travel?.[category.scoringMode]?.durationMin;
  return { ...base, score: minutes === undefined ? null : scoreTime(minutes, category.scoring) };
}

/**
 * Total = Σ(puntaje × peso) / Σ(peso), ignorando los elementos con peso 0 y
 * los que no tienen datos (esos marcan la puntuación como parcial).
 */
export function computeScore({ analysis, fixedPlaces, settings }: ScoreInput): CandidateScore | null {
  if (!analysis) return null;

  const items: ScorableItem[] = [
    ...fixedPlaces.map((place) => scoreFixedPlace(place, analysis, settings.primaryMode)),
    ...settings.categories
      .filter((category) => category.enabled)
      .map((category) =>
        scoreCategory(
          category,
          analysis.categories.find((result) => result.categoryId === category.id),
        ),
      ),
  ];

  const weighted = items.filter((item) => item.weight > 0);
  const scorable = weighted.filter((item) => item.score !== null);
  const partial = scorable.length < weighted.length;

  if (scorable.length === 0) {
    return { total: 0, breakdown: [], ...(weighted.length > 0 ? { partial: true } : {}) };
  }

  const totalWeight = scorable.reduce((sum, item) => sum + item.weight, 0);
  const weightedSum = scorable.reduce((sum, item) => sum + item.score! * item.weight, 0);

  const breakdown: ScoreBreakdownItem[] = scorable
    .map((item) => ({
      itemId: item.itemId,
      label: item.label,
      score: Math.round(item.score!),
      weight: item.weight,
    }))
    // Primero lo que más pesa en el resultado.
    .sort((a, b) => b.weight * b.score - a.weight * a.score);

  return {
    total: Math.round(weightedSum / totalWeight),
    breakdown,
    ...(partial ? { partial: true } : {}),
  };
}

export type DensityLevel = 'low' | 'medium' | 'high';

/** Nivel bajo/medio/alto de una categoría `density` (sección 15). */
export function densityLevel(
  count: number,
  thresholds: { low: number; high: number },
): DensityLevel {
  if (count < thresholds.low) return 'low';
  if (count > thresholds.high) return 'high';
  return 'medium';
}

export const DENSITY_LABEL: Record<DensityLevel, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
};
