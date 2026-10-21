import { Circle } from 'react-leaflet';
import type { LatLng } from '@/types';

export interface RadiusCircleProps {
  center: LatLng;
  radiusM: number;
  /** Círculo tenue con el radio de la categoría seleccionada (sección 8.1). */
  variant?: 'category' | 'accuracy';
}

export function RadiusCircle({ center, radiusM, variant = 'category' }: RadiusCircleProps) {
  const accuracy = variant === 'accuracy';
  return (
    <Circle
      center={[center.lat, center.lng]}
      radius={radiusM}
      pathOptions={{
        color: '#1a1a1a',
        weight: 1,
        opacity: accuracy ? 0.5 : 0.35,
        fillColor: '#4a4a4a',
        fillOpacity: accuracy ? 0.12 : 0.06,
        dashArray: accuracy ? '4 4' : undefined,
      }}
    />
  );
}
