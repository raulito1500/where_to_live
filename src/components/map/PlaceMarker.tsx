import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import { Icon } from '@/components/ui';
import type { LatLng } from '@/types';
import { reactDivIcon } from './markerIcon';

export interface PlaceMarkerProps {
  position: LatLng;
  iconName?: string;
  label?: string;
  /** `fixed`: círculo blanco con borde negro. `nearby`: pequeño y gris (8.1). */
  kind?: 'fixed' | 'nearby';
  onClick?: () => void;
}

export function PlaceMarker({ position, iconName, label, kind = 'fixed', onClick }: PlaceMarkerProps) {
  const size = kind === 'fixed' ? 30 : 22;
  const icon = useMemo(
    () =>
      reactDivIcon(
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            borderRadius: '9999px',
            background: '#fff',
            border: kind === 'fixed' ? '2px solid #000' : '1px solid #6b6b6b',
            color: kind === 'fixed' ? '#000' : '#4a4a4a',
            boxShadow: '0 1px 2px rgba(0,0,0,.25)',
          }}
        >
          <Icon name={iconName} size={kind === 'fixed' ? 16 : 12} />
        </span>,
        { size },
      ),
    [iconName, kind, size],
  );

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={icon}
      eventHandlers={{ click: () => onClick?.() }}
    >
      {label ? <Tooltip direction="top">{label}</Tooltip> : null}
    </Marker>
  );
}
