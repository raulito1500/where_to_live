import { useEffect, type ReactNode } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { cn } from '@/lib/cn';
import type { TileSource } from '@/providers/types';
import type { LatLng } from '@/types';

/**
 * Única frontera con Leaflet (sección 6): el resto de la app habla con
 * `<MapView />` por props. Migrar a Google Maps = reimplementar este archivo.
 * Componente presentacional: no lee stores ni llama APIs; recibe `tiles`.
 */
export interface MapViewProps {
  tiles: TileSource;
  center: LatLng;
  zoom?: number;
  /** Posición a la que volar cuando cambia (ej. candidato seleccionado). */
  focus?: (LatLng & { zoom?: number }) | null;
  /** Modo "colocar pin" (sección 8.7): cursor de cruz y clic activo. */
  picking?: boolean;
  onMapClick?: (position: LatLng) => void;
  className?: string;
  children?: ReactNode;
}

function ClickHandler({ onMapClick }: { onMapClick: (position: LatLng) => void }) {
  useMapEvents({
    click: (event) => onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });
  return null;
}

function FocusHandler({ focus }: { focus: LatLng & { zoom?: number } }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([focus.lat, focus.lng], focus.zoom ?? map.getZoom(), { duration: 0.6 });
  }, [map, focus.lat, focus.lng, focus.zoom]);
  return null;
}

/** El contenedor debe tener altura definida; el mapa ocupa el 100%. */
export function MapView({
  tiles,
  center,
  zoom = 13,
  focus = null,
  picking = false,
  onMapClick,
  className,
  children,
}: MapViewProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom
      zoomControl={false}
      className={cn('h-full w-full', picking && 'cursor-crosshair', className)}
    >
      <TileLayer
        url={tiles.url}
        attribution={tiles.attribution}
        maxZoom={tiles.maxZoom}
        {...(tiles.subdomains ? { subdomains: tiles.subdomains } : {})}
      />
      {onMapClick ? <ClickHandler onMapClick={onMapClick} /> : null}
      {focus ? <FocusHandler focus={focus} /> : null}
      {children}
    </MapContainer>
  );
}
