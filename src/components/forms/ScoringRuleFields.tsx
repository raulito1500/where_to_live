import { useId } from 'react';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ScoringRule } from '@/types';

export interface ScoringRuleFieldsProps {
  label: string;
  icon?: string;
  rule: ScoringRule;
  /** `count` reinterpreta los umbrales como conteos (sección 7.1). */
  kind: 'time' | 'count';
  /** Texto del modo con el que se puntúa, ej. "a pie". */
  modeLabel?: string;
  onChange: (patch: Partial<ScoringRule>) => void;
}

/**
 * Peso (0–5) y umbrales de un elemento puntuable (sección 8.6).
 * Con peso 0 los umbrales se desactivan: el elemento no cuenta.
 */
export function ScoringRuleFields({
  label,
  icon,
  rule,
  kind,
  modeLabel,
  onChange,
}: ScoringRuleFieldsProps) {
  const id = useId();
  const disabled = rule.weight === 0;

  return (
    <div className="flex flex-col gap-2 border-b border-gray-200 py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-gray-900">
          {icon ? <Icon name={icon} size={14} /> : null}
          <span className="truncate">{label}</span>
          {modeLabel ? <span className="text-xs font-normal text-gray-500">{modeLabel}</span> : null}
        </span>
        <span className="shrink-0 text-xs text-gray-600">
          {disabled ? 'No cuenta' : `Peso ${rule.weight}`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-weight`} className="text-xs text-gray-600">
          Importancia
        </label>
        <input
          id={`${id}-weight`}
          type="range"
          min={0}
          max={5}
          step={1}
          value={rule.weight}
          onChange={(event) => onChange({ weight: Number(event.target.value) })}
          className="h-1.5 flex-1 accent-gray-900"
        />
        <span className="w-4 text-right text-xs font-semibold tabular-nums">{rule.weight}</span>
      </div>

      <div className={cn('grid grid-cols-2 gap-2', disabled && 'opacity-45')}>
        <label className="flex flex-col gap-1 text-[11px] text-gray-600">
          {kind === 'time' ? '100 puntos hasta (min)' : '100 puntos desde (cantidad)'}
          <input
            type="number"
            min={0}
            disabled={disabled}
            value={rule.idealMin}
            onChange={(event) => onChange({ idealMin: Number(event.target.value) })}
            className="h-9 rounded-lg border border-gray-300 px-2 text-sm tabular-nums disabled:bg-gray-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-gray-600">
          {kind === 'time' ? '0 puntos desde (min)' : '0 puntos en (cantidad)'}
          <input
            type="number"
            min={0}
            disabled={disabled}
            value={rule.maxMin}
            onChange={(event) => onChange({ maxMin: Number(event.target.value) })}
            className="h-9 rounded-lg border border-gray-300 px-2 text-sm tabular-nums disabled:bg-gray-50"
          />
        </label>
      </div>
    </div>
  );
}
