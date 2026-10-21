import { useState } from 'react';
import { ChevronDown, ChevronUp, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatScore } from '@/lib/format';
import type { CandidateScore } from '@/types';

export interface ScoreBreakdownProps {
  score: CandidateScore | null;
}

/** Puntuación total 0–100 con desglose desplegable (secciones 7.1 y 8.2). */
export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  const [open, setOpen] = useState(false);

  if (!score) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 px-3 py-2.5">
        <span className="text-2xl font-bold text-gray-400 tabular-nums">—</span>
        <p className="text-xs text-gray-600">Analiza el candidato para obtener su puntuación.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-300 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none font-bold text-gray-900 tabular-nums">
          {formatScore(score.total)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900">Puntuación sobre 100</p>
          {score.partial ? (
            <p className="flex items-center gap-1 text-[11px] text-gray-700">
              <TriangleAlert size={11} aria-hidden />
              Parcial: faltaron datos de algún elemento.
            </p>
          ) : (
            <p className="text-[11px] text-gray-600">
              Promedio ponderado de {score.breakdown.length} elementos.
            </p>
          )}
        </div>
        {score.breakdown.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen((value) => !value)}
            leadingIcon={open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          >
            {open ? 'Ocultar' : 'Desglose'}
          </Button>
        ) : null}
      </div>

      {open ? (
        <ul className="flex flex-col gap-1.5 border-t border-gray-200 pt-2">
          {score.breakdown.map((item) => (
            <li key={item.itemId} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-xs text-gray-700">{item.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                <span
                  className="block h-full rounded-full bg-gray-800"
                  style={{ width: `${item.score}%` }}
                />
              </span>
              <span className="w-8 text-right text-xs font-semibold text-gray-900 tabular-nums">
                {item.score}
              </span>
              <span className="w-12 text-right text-[11px] text-gray-600">peso {item.weight}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
