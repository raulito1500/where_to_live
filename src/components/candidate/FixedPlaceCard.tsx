import { Route } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Icon, Skeleton } from '@/components/ui';
import { formatDistanceKm } from '@/lib/format';
import { TRAVEL_MODES } from '@/types';
import type { FixedPlace, FixedPlaceResult, TravelMode } from '@/types';
import { TravelTime } from './TravelTime';

export interface FixedPlaceCardProps {
  place: FixedPlace;
  result: FixedPlaceResult | undefined;
  primaryMode: TravelMode;
  loading?: boolean;
  /** Dibuja la ruta hacia este lugar en el mapa. */
  onShowRoute?: (place: FixedPlace) => void;
  routeShown?: boolean;
  routeAvailable?: boolean;
}

/** Tarjeta de un lugar fijo con los cuatro modos (sección 8.2). */
export function FixedPlaceCard({
  place,
  result,
  primaryMode,
  loading = false,
  onShowRoute,
  routeShown = false,
  routeAvailable = true,
}: FixedPlaceCardProps) {
  // El modo principal primero; el resto en el orden de la spec.
  const modes: TravelMode[] = [primaryMode, ...TRAVEL_MODES.filter((mode) => mode !== primaryMode)];

  return (
    <Card>
      <CardHeader
        icon={<Icon name={place.icon} size={15} />}
        title={place.label}
        subtitle={
          result
            ? `${formatDistanceKm(result.straightLineKm)} en línea recta`
            : place.address || 'Sin dirección'
        }
        actions={
          onShowRoute && routeAvailable ? (
            <Button
              size="sm"
              variant={routeShown ? 'primary' : 'ghost'}
              leadingIcon={<Route size={14} />}
              onClick={() => onShowRoute(place)}
            >
              Ruta
            </Button>
          ) : null
        }
      />
      <CardBody>
        {loading && !result ? (
          <div className="grid grid-cols-2 gap-2">
            {modes.map((mode) => (
              <Skeleton key={mode} className="h-14" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {modes.map((mode) => (
              <TravelTime
                key={mode}
                mode={mode}
                travel={result?.travel[mode]}
                primary={mode === primaryMode}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
