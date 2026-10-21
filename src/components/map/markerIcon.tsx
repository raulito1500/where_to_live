import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';

/**
 * Convierte un fragmento de React en un `divIcon` de Leaflet. Así los
 * marcadores usan los mismos iconos lucide y las mismas clases grises que el
 * resto de la UI, sin imágenes de colores.
 */
export function reactDivIcon(
  element: ReactElement,
  options: { size: number; className?: string; anchor?: [number, number] },
): L.DivIcon {
  const { size, className, anchor } = options;
  return L.divIcon({
    html: renderToStaticMarkup(element),
    className: `wtl-marker ${className ?? ''}`.trim(),
    iconSize: [size, size],
    iconAnchor: anchor ?? [size / 2, size / 2],
  });
}
