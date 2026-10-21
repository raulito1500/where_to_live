import { Polyline } from 'react-leaflet';
import type { LatLng } from '@/types';

export interface RouteLayerProps {
  points: LatLng[] | null;
}

/** Polilínea gris oscuro de la ruta seleccionada (sección 8.1). */
export function RouteLayer({ points }: RouteLayerProps) {
  if (!points || points.length < 2) return null;
  return (
    <>
      {/* Halo blanco debajo para que la línea se lea sobre el mapa gris. */}
      <Polyline
        positions={points.map((point) => [point.lat, point.lng])}
        pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }}
      />
      <Polyline
        positions={points.map((point) => [point.lat, point.lng])}
        pathOptions={{ color: '#1a1a1a', weight: 4, opacity: 0.85 }}
      />
    </>
  );
}
