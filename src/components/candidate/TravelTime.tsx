import { Badge, Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDistanceKm, formatDuration } from '@/lib/format';
import { TRAVEL_MODE_ICON, TRAVEL_MODE_LABEL } from '@/lib/labels';
import type { TravelInfo, TravelMode } from '@/types';

export interface TravelTimeProps {
  mode: TravelMode;
  travel: TravelInfo | undefined;
  /** El modo principal de Ajustes se destaca (sección 8.2). */
  primary?: boolean;
}

/**
 * Tiempo en un modo, con icono lucide (nunca emojis) y marca de "estimado".
 * Se distingue por peso y borde, no por color (sección 9).
 */
export function TravelTime({ mode, travel, primary = false }: TravelTimeProps) {
  const label = TRAVEL_MODE_LABEL[mode];
  const unavailable = travel === undefined;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2.5 py-2',
        primary ? 'border-gray-900 bg-gray-50' : 'border-gray-200',
        unavailable && 'border-dashed',
      )}
    >
      <Icon
        name={TRAVEL_MODE_ICON[mode]}
        size={16}
        className={primary ? 'text-gray-900' : 'text-gray-600'}
      />
      <div className="min-w-0">
        <p className="sr-only">{label}</p>
        <p
          className={cn(
            'text-sm tabular-nums',
            primary ? 'font-bold text-gray-900' : 'font-medium text-gray-800',
          )}
        >
          {unavailable ? 'Sin dato' : formatDuration(travel.durationMin)}
        </p>
        {travel?.distanceKm !== undefined ? (
          <p className="text-[11px] text-gray-600 tabular-nums">
            {formatDistanceKm(travel.distanceKm)}
          </p>
        ) : null}
        {travel?.transfers !== undefined && travel.transfers > 0 ? (
          <p className="text-[11px] text-gray-600">
            {travel.transfers} {travel.transfers === 1 ? 'transbordo' : 'transbordos'}
          </p>
        ) : null}
      </div>
      {travel?.estimated ? (
        <Badge variant="warning" className="ml-auto" title="Calculado en línea recta, sin rutas reales">
          est.
        </Badge>
      ) : null}
    </div>
  );
}
