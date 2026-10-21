import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import type { LatLng } from '@/types';
import { reactDivIcon } from './markerIcon';

export interface CandidateMarkerProps {
  position: LatLng;
  label?: string;
  /** Marcador grande y negro para el candidato activo (sección 8.1). */
  active?: boolean;
  draggable?: boolean;
  onDragEnd?: (position: LatLng) => void;
  onClick?: () => void;
}

export function CandidateMarker({
  position,
  label,
  active = true,
  draggable = false,
  onDragEnd,
  onClick,
}: CandidateMarkerProps) {
  const size = active ? 34 : 26;
  const icon = useMemo(
    () =>
      reactDivIcon(
        <span
          style={{
            display: 'block',
            width: size,
            height: size,
            borderRadius: '50% 50% 50% 4px',
            transform: 'rotate(45deg)',
            background: active ? '#000' : '#fff',
            border: `2px solid #000`,
            boxShadow: '0 1px 3px rgba(0,0,0,.35)',
          }}
        />,
        { size, anchor: [size / 2, size] },
      ),
    [size, active],
  );

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={icon}
      draggable={draggable}
      eventHandlers={{
        click: () => onClick?.(),
        dragend: (event) => {
          const { lat, lng } = event.target.getLatLng();
          onDragEnd?.({ lat, lng });
        },
      }}
      {...(label ? { title: label } : {})}
    >
      {label ? <Tooltip direction="top">{label}</Tooltip> : null}
    </Marker>
  );
}
