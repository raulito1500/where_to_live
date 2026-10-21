import { useState } from 'react';
import { ChevronDown, ChevronUp, Route } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Icon, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDistanceKm, formatDuration, formatMeters } from '@/lib/format';
import { densityLevel } from '@/lib/scoring';
import { TRAVEL_MODE_SHORT_LABEL } from '@/lib/labels';
import type { CategoryResult, NearbyPlace, PlaceCategory } from '@/types';
import { DensityBar } from './DensityBar';

export interface CategoryCardProps {
  category: PlaceCategory;
  result: CategoryResult | undefined;
  densityThresholds: { low: number; high: number };
  loading?: boolean;
  onShowRoute?: (place: NearbyPlace, category: PlaceCategory) => void;
  routeOsmId?: string | null;
}

function PlaceRow({
  place,
  category,
  highlighted,
  onShowRoute,
  routeShown,
}: {
  place: NearbyPlace;
  category: PlaceCategory;
  highlighted: boolean;
  onShowRoute?: (place: NearbyPlace, category: PlaceCategory) => void;
  routeShown: boolean;
}) {
  const travel = place.travel?.[category.scoringMode];
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2.5 py-2',
        highlighted ? 'border-gray-900 bg-gray-50' : 'border-gray-200',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm', highlighted ? 'font-semibold' : 'font-medium')}>
          {place.name ?? 'Sin nombre'}
        </p>
        <p className="text-[11px] text-gray-600 tabular-nums">
          {formatDistanceKm(place.straightLineKm)} en línea recta
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900 tabular-nums">
          {formatDuration(travel?.durationMin)}
        </p>
        <p className="text-[11px] text-gray-600">
          {TRAVEL_MODE_SHORT_LABEL[category.scoringMode]}
          {travel?.estimated ? ' · est.' : ''}
        </p>
      </div>
      {onShowRoute ? (
        <Button
          size="sm"
          variant={routeShown ? 'primary' : 'ghost'}
          leadingIcon={<Route size={13} />}
          onClick={() => onShowRoute(place, category)}
        >
          <span className="sr-only">Ver ruta a {place.name ?? 'este lugar'}</span>
        </Button>
      ) : null}
    </div>
  );
}

/** Tarjeta de una categoría: el más cercano y "ver otros 2" (sección 8.2). */
export function CategoryCard({
  category,
  result,
  densityThresholds,
  loading = false,
  onShowRoute,
  routeOsmId = null,
}: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const header = (
    <CardHeader
      icon={<Icon name={category.icon} size={15} />}
      title={category.label}
      subtitle={`Radio ${formatMeters(category.radiusM)}`}
      actions={
        category.scoring.weight === 0 ? (
          <Badge variant="subtle" title="No cuenta para la puntuación">
            sin peso
          </Badge>
        ) : null
      }
    />
  );

  if (loading && !result) {
    return (
      <Card>
        {header}
        <CardBody>
          <Skeleton className="h-12" />
        </CardBody>
      </Card>
    );
  }

  if (category.kind === 'density') {
    const count = result?.countInRadius ?? 0;
    return (
      <Card>
        {header}
        <CardBody>
          {result ? (
            <DensityBar
              count={count}
              level={densityLevel(count, densityThresholds)}
              radiusM={category.radiusM}
              label={category.label.toLowerCase()}
            />
          ) : (
            <p className="text-sm text-gray-600">Sin datos.</p>
          )}
        </CardBody>
      </Card>
    );
  }

  const nearest = result?.nearest ?? [];
  const others = nearest.slice(1);

  return (
    <Card>
      {header}
      <CardBody className="flex flex-col gap-2">
        {nearest.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-600">
            Nada encontrado en {formatMeters(category.radiusM)}.
          </p>
        ) : (
          <>
            <PlaceRow
              place={nearest[0]!}
              category={category}
              highlighted
              {...(onShowRoute ? { onShowRoute } : {})}
              routeShown={routeOsmId === nearest[0]!.osmId}
            />

            {others.length > 0 ? (
              <>
                {expanded
                  ? others.map((place) => (
                      <PlaceRow
                        key={place.osmId}
                        place={place}
                        category={category}
                        highlighted={false}
                        {...(onShowRoute ? { onShowRoute } : {})}
                        routeShown={routeOsmId === place.osmId}
                      />
                    ))
                  : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded((value) => !value)}
                  leadingIcon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  className="self-start"
                >
                  {expanded ? 'Ocultar' : `Ver otros ${others.length}`}
                </Button>
              </>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}
