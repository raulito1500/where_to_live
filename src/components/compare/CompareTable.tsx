import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDuration, formatScore } from '@/lib/format';
import type {
  Candidate,
  CandidateScore,
  FixedPlace,
  PlaceCategory,
  TravelMode,
} from '@/types';

export interface CompareRow {
  id: string;
  label: string;
  icon?: string;
  /** `count` en categorías de densidad: más es mejor; en tiempos, menos. */
  kind: 'time' | 'count';
  /** Valor por candidato; `undefined` = sin dato. */
  values: Record<string, number | undefined>;
}

export interface CompareTableProps {
  candidates: Candidate[];
  scores: Record<string, CandidateScore | null>;
  rows: CompareRow[];
  mode: TravelMode;
}

/** Índices de los mejores valores de una fila (puede haber empate). */
function bestIds(row: CompareRow, candidateIds: string[]): Set<string> {
  const entries = candidateIds
    .map((id) => [id, row.values[id]] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== undefined);
  if (entries.length < 2) return new Set();

  const best = entries.reduce(
    (current, [, value]) =>
      row.kind === 'count' ? Math.max(current, value) : Math.min(current, value),
    entries[0]![1],
  );
  return new Set(entries.filter(([, value]) => value === best).map(([id]) => id));
}

/**
 * Tabla de comparación (sección 8.4): filas = lugares fijos y categorías,
 * columnas = candidatos. El mejor valor de cada fila se resalta con negrita y
 * un fondo más oscuro.
 */
export function CompareTable({ candidates, scores, rows, mode }: CompareTableProps) {
  const ids = candidates.map((candidate) => candidate.id);
  const scoreValues: Record<string, number | undefined> = {};
  for (const candidate of candidates) {
    scoreValues[candidate.id] = scores[candidate.id]?.total;
  }
  const scoreRow: CompareRow = {
    id: '__score__',
    label: 'Puntuación',
    kind: 'count',
    values: scoreValues,
  };
  const bestScores = bestIds(scoreRow, ids);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <caption className="sr-only">
          Comparación de candidatos. El mejor valor de cada fila está en negrita.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-40 border-b border-gray-300 px-2 py-2 text-left text-xs font-semibold tracking-wide text-gray-700 uppercase">
              Criterio
            </th>
            {candidates.map((candidate) => (
              <th
                key={candidate.id}
                scope="col"
                className="border-b border-gray-300 px-2 py-2 text-left text-sm font-semibold text-gray-900"
              >
                <span className="block max-w-[10rem] truncate">{candidate.name}</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Primera fila: puntuación total (sección 8.4). */}
          <tr>
            <th scope="row" className="border-b-2 border-gray-300 px-2 py-2.5 text-left font-semibold text-gray-900">
              Puntuación
            </th>
            {candidates.map((candidate) => {
              const value = scoreValues[candidate.id];
              const best = bestScores.has(candidate.id);
              return (
                <td
                  key={candidate.id}
                  className={cn(
                    'border-b-2 border-gray-300 px-2 py-2.5 tabular-nums',
                    best ? 'bg-gray-200 font-bold text-gray-900' : 'text-gray-800',
                  )}
                >
                  {formatScore(value)}
                  {best ? <span className="sr-only"> (mejor)</span> : null}
                </td>
              );
            })}
          </tr>

          {rows.map((row) => {
            const best = bestIds(row, ids);
            return (
              <tr key={row.id}>
                <th scope="row" className="border-b border-gray-200 px-2 py-2 text-left font-medium text-gray-800">
                  <span className="flex items-center gap-1.5">
                    {row.icon ? <Icon name={row.icon} size={13} /> : null}
                    <span className="truncate">{row.label}</span>
                  </span>
                </th>
                {candidates.map((candidate) => {
                  const value = row.values[candidate.id];
                  const isBest = best.has(candidate.id);
                  return (
                    <td
                      key={candidate.id}
                      className={cn(
                        'border-b border-gray-200 px-2 py-2 tabular-nums',
                        isBest ? 'bg-gray-200 font-bold text-gray-900' : 'text-gray-700',
                      )}
                    >
                      {value === undefined
                        ? '—'
                        : row.kind === 'count'
                          ? value
                          : formatDuration(value)}
                      {isBest ? <span className="sr-only"> (mejor)</span> : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Fila final de notas (sección 8.4). */}
          <tr>
            <th scope="row" className="px-2 py-2 text-left align-top font-medium text-gray-800">
              Notas
            </th>
            {candidates.map((candidate) => (
              <td key={candidate.id} className="px-2 py-2 align-top text-xs text-gray-600">
                {candidate.notes?.trim() || '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-600">
        Los tiempos son en modo <span className="font-medium">{mode}</span>; las categorías usan su
        propio modo de puntuación.
      </p>
    </div>
  );
}

/** Construye las filas a partir de los análisis guardados. */
export function buildCompareRows(
  candidates: Candidate[],
  fixedPlaces: FixedPlace[],
  categories: PlaceCategory[],
  mode: TravelMode,
): CompareRow[] {
  const rows: CompareRow[] = [];

  for (const place of fixedPlaces) {
    const values: Record<string, number | undefined> = {};
    for (const candidate of candidates) {
      values[candidate.id] = candidate.analysis?.fixed.find(
        (result) => result.fixedPlaceId === place.id,
      )?.travel[mode]?.durationMin;
    }
    rows.push({
      id: `fixed-${place.id}`,
      label: place.label,
      ...(place.icon ? { icon: place.icon } : {}),
      kind: 'time',
      values,
    });
  }

  for (const category of categories.filter((item) => item.enabled)) {
    const values: Record<string, number | undefined> = {};
    for (const candidate of candidates) {
      const result = candidate.analysis?.categories.find(
        (item) => item.categoryId === category.id,
      );
      values[candidate.id] =
        category.kind === 'density'
          ? result?.countInRadius
          : result?.nearest[0]?.travel?.[mode]?.durationMin;
    }
    rows.push({
      id: `cat-${category.id}`,
      label: category.label,
      icon: category.icon,
      kind: category.kind === 'density' ? 'count' : 'time',
      values,
    });
  }

  return rows;
}
