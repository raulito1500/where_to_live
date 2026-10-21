import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Candidate, CandidateScore, FixedPlace, PlaceCategory } from '@/types';
import { buildCompareRows, CompareTable } from './CompareTable';

const travel = (durationMin: number) => ({
  foot: { mode: 'foot' as const, durationMin, estimated: false },
});

const uni: FixedPlace = {
  id: 'uni',
  label: 'Universidad',
  address: '',
  position: { lat: 52.4, lng: 13.05 },
  scoring: { weight: 5, idealMin: 15, maxMin: 60 },
};

const restaurants: PlaceCategory = {
  id: 'restaurants',
  label: 'Restaurantes',
  icon: 'Utensils',
  enabled: true,
  kind: 'density',
  radiusM: 600,
  osmFilters: ['["amenity"="restaurant"]'],
  scoring: { weight: 2, idealMin: 20, maxMin: 0 },
  scoringMode: 'foot',
};

const candidate = (id: string, minutes: number, count: number, notes?: string): Candidate => ({
  id,
  name: `Apto ${id}`,
  address: '',
  position: { lat: 52.39, lng: 13.06 },
  createdAt: '2026-09-28T10:00:00Z',
  ...(notes ? { notes } : {}),
  analysis: {
    computedAt: '2026-09-28T10:00:00Z',
    fixed: [{ fixedPlaceId: 'uni', straightLineKm: 2, travel: travel(minutes) }],
    categories: [
      { categoryId: 'restaurants', nearest: [], countInRadius: count, radiusM: 600 },
    ],
  },
});

const scores: Record<string, CandidateScore | null> = {
  a: { total: 72, breakdown: [] },
  b: { total: 85, breakdown: [] },
};

describe('buildCompareRows', () => {
  it('genera una fila por lugar fijo y por categoría activa', () => {
    const rows = buildCompareRows([candidate('a', 12, 8)], [uni], [restaurants], 'foot');
    expect(rows.map((row) => row.id)).toEqual(['fixed-uni', 'cat-restaurants']);
    expect(rows[0]?.kind).toBe('time');
    expect(rows[1]?.kind).toBe('count');
  });

  it('omite las categorías desactivadas', () => {
    const rows = buildCompareRows(
      [candidate('a', 12, 8)],
      [],
      [{ ...restaurants, enabled: false }],
      'foot',
    );
    expect(rows).toHaveLength(0);
  });

  it('deja el valor sin definir cuando falta el análisis', () => {
    const sinAnalisis: Candidate = {
      id: 'c',
      name: 'Apto c',
      address: '',
      position: { lat: 52.39, lng: 13.06 },
      createdAt: '2026-09-28T10:00:00Z',
    };
    const rows = buildCompareRows([sinAnalisis], [uni], [], 'foot');
    expect(rows[0]?.values.c).toBeUndefined();
  });
});

describe('CompareTable', () => {
  const candidates = [candidate('a', 12, 8, 'Sin ascensor'), candidate('b', 25, 21)];
  const rows = buildCompareRows(candidates, [uni], [restaurants], 'foot');

  it('pone la puntuación en la primera fila y marca la mayor', () => {
    render(<CompareTable candidates={candidates} scores={scores} rows={rows} mode="foot" />);
    const scoreRow = screen.getByRole('row', { name: /Puntuación/ });
    const cells = within(scoreRow).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('72');
    expect(cells[1]).toHaveTextContent('85');
    // La mejor lleva marca accesible además del resaltado visual.
    expect(cells[1]).toHaveTextContent('(mejor)');
    expect(cells[0]).not.toHaveTextContent('(mejor)');
  });

  it('en tiempos gana el menor y en conteos el mayor', () => {
    render(<CompareTable candidates={candidates} scores={scores} rows={rows} mode="foot" />);

    const timeCells = within(screen.getByRole('row', { name: /Universidad/ })).getAllByRole('cell');
    expect(timeCells[0]).toHaveTextContent('12 min');
    expect(timeCells[0]).toHaveTextContent('(mejor)');

    const countCells = within(screen.getByRole('row', { name: /Restaurantes/ })).getAllByRole('cell');
    expect(countCells[1]).toHaveTextContent('21');
    expect(countCells[1]).toHaveTextContent('(mejor)');
  });

  it('muestra un guion donde no hay dato y no lo marca como mejor', () => {
    const incompleto = [candidates[0]!, { ...candidates[1]!, analysis: undefined }];
    const incompleteRows = buildCompareRows(incompleto, [uni], [restaurants], 'foot');
    render(<CompareTable candidates={incompleto} scores={scores} rows={incompleteRows} mode="foot" />);

    const cells = within(screen.getByRole('row', { name: /Universidad/ })).getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('—');
    // Con un solo valor no hay comparación que resaltar.
    expect(cells[0]).not.toHaveTextContent('(mejor)');
  });

  it('incluye la fila de notas', () => {
    render(<CompareTable candidates={candidates} scores={scores} rows={rows} mode="foot" />);
    const notes = within(screen.getByRole('row', { name: /Notas/ })).getAllByRole('cell');
    expect(notes[0]).toHaveTextContent('Sin ascensor');
    expect(notes[1]).toHaveTextContent('—');
  });
});
