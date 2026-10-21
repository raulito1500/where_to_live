import { useMemo } from 'react';
import { computeScore } from '@/lib/scoring';
import type { Candidate, CandidateScore } from '@/types';
import { useCandidates } from './useCandidates';
import { useFixedPlaces } from './useFixedPlaces';
import { useSettings } from './useSettings';

/**
 * Puntuación de un candidato (sección 7.1). Es un valor DERIVADO: se calcula
 * de `analysis` + pesos + umbrales cada vez que algo cambia, así que mover un
 * slider en Ajustes la actualiza al instante y sin consultar ninguna API.
 * Por eso no se persiste: el dato guardado es el análisis, no el puntaje.
 */
export function useCandidateScore(candidate: Candidate | null): CandidateScore | null {
  const fixedPlaces = useFixedPlaces();
  const settings = useSettings();

  return useMemo(
    () =>
      candidate
        ? computeScore({
            analysis: candidate.analysis,
            fixedPlaces,
            settings: { primaryMode: settings.primaryMode, categories: settings.categories },
          })
        : null,
    [candidate, fixedPlaces, settings.primaryMode, settings.categories],
  );
}

/** Puntuación de todos los candidatos, para la lista y la comparación. */
export function useCandidateScores(): Record<string, CandidateScore | null> {
  const candidates = useCandidates();
  const fixedPlaces = useFixedPlaces();
  const settings = useSettings();

  return useMemo(() => {
    const scores: Record<string, CandidateScore | null> = {};
    for (const candidate of candidates) {
      scores[candidate.id] = computeScore({
        analysis: candidate.analysis,
        fixedPlaces,
        settings: { primaryMode: settings.primaryMode, categories: settings.categories },
      });
    }
    return scores;
  }, [candidates, fixedPlaces, settings.primaryMode, settings.categories]);
}
