import { cn } from '@/lib/cn';
import { DENSITY_LABEL, type DensityLevel } from '@/lib/scoring';

export interface DensityBarProps {
  count: number;
  level: DensityLevel;
  radiusM: number;
  label?: string;
}

const FILL: Record<DensityLevel, string> = {
  low: 'w-1/4',
  medium: 'w-2/3',
  high: 'w-full',
};

/** "23 restaurantes en 600 m" con barra de nivel bajo/medio/alto (sección 8.2). */
export function DensityBar({ count, level, radiusM, label = 'lugares' }: DensityBarProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-gray-800">
        <span className="font-semibold tabular-nums">{count}</span> {label} en{' '}
        <span className="tabular-nums">{radiusM} m</span>
      </p>
      <div className="flex items-center gap-2">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"
          role="meter"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-label={`Densidad: ${DENSITY_LABEL[level]}`}
        >
          <div className={cn('h-full rounded-full bg-gray-800', FILL[level])} />
        </div>
        <span className="text-xs font-medium text-gray-700">{DENSITY_LABEL[level]}</span>
      </div>
    </div>
  );
}
