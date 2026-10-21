import { useCallback, useRef, useState } from 'react';
import { analyzeCandidate, type AnalysisBlocks, type AnalysisSnapshot } from '@/lib/analysis';
import { providers } from '@/providers';
import { useCandidatesStore } from '@/store';
import type { Candidate } from '@/types';
import { useEnabledCategories, useSettings } from './useSettings';
import { useFixedPlaces } from './useFixedPlaces';

export type AnalyzeStatus = 'idle' | 'running' | 'done' | 'error';

export interface UseAnalyzeCandidateResult {
  status: AnalyzeStatus;
  /** Resultados parciales mientras corre (sección 7, paso 5). */
  partial: AnalysisSnapshot | null;
  blocks: AnalysisBlocks | null;
  error: string | null;
  run: (candidate: Candidate) => Promise<void>;
  cancel: () => void;
}

/**
 * Ejecuta el análisis de un candidato y guarda el resultado en la store.
 * Toda la lógica de red está en `lib/analysis.ts` y en los providers; aquí sólo
 * se gestiona el ciclo de vida en React.
 */
export function useAnalyzeCandidate(): UseAnalyzeCandidateResult {
  const fixedPlaces = useFixedPlaces();
  const categories = useEnabledCategories();
  const settings = useSettings();
  const setAnalysis = useCandidatesStore((state) => state.setAnalysis);

  const [status, setStatus] = useState<AnalyzeStatus>('idle');
  const [partial, setPartial] = useState<AnalysisSnapshot | null>(null);
  const [blocks, setBlocks] = useState<AnalysisBlocks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }, []);

  const run = useCallback(
    async (candidate: Candidate) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus('running');
      setError(null);
      setBlocks(null);
      setPartial(null);

      try {
        const { fixed, categories: categoryResults, blocks: resultBlocks } =
          await analyzeCandidate({
            origin: candidate.position,
            fixedPlaces,
            categories,
            routing: providers.routing,
            transit: providers.transit,
            places: providers.places,
            transitDepartureTime: settings.transitDepartureTime,
            primaryMode: settings.primaryMode,
            signal: controller.signal,
            onPartial: setPartial,
          });

        if (controller.signal.aborted) return;

        setPartial({ fixed, categories: categoryResults });
        setBlocks(resultBlocks);
        setAnalysis(candidate.id, {
          computedAt: new Date().toISOString(),
          fixed,
          categories: categoryResults,
        });
        setStatus('done');
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : 'El análisis falló');
        setStatus('error');
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [fixedPlaces, categories, settings.transitDepartureTime, settings.primaryMode, setAnalysis],
  );

  return { status, partial, blocks, error, run, cancel };
}
