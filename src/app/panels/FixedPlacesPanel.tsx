import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, EmptyState, Icon, IconButton, Modal } from '@/components/ui';
import { formatCoords, formatDuration } from '@/lib/format';
import type { FixedPlace } from '@/types';

export interface FixedPlacesPanelProps {
  places: FixedPlace[];
  onAddPlace: () => void;
  onEditPlace: (id: string) => void;
  onRemovePlace: (id: string) => void;
  onSelectPlace: (id: string) => void;
}

/** Pestaña "Lugares fijos" (sección 8.5). El formulario CRUD llega en Fase 1. */
export function FixedPlacesPanel({
  places,
  onAddPlace,
  onEditPlace,
  onRemovePlace,
  onSelectPlace,
}: FixedPlacesPanelProps) {
  const [pendingRemoval, setPendingRemoval] = useState<FixedPlace | null>(null);

  if (places.length === 0) {
    return (
      <EmptyState
        icon={<MapPin size={22} />}
        title="Sin lugares fijos"
        description="La universidad, el trabajo, la casa de alguien: los lugares a los que vas siempre. Se usan para medir cada candidato."
        action={
          <Button variant="primary" leadingIcon={<Plus size={16} />} onClick={onAddPlace}>
            Agregar lugar fijo
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          {places.length} {places.length === 1 ? 'lugar' : 'lugares'}
        </p>
        <Button size="sm" leadingIcon={<Plus size={14} />} onClick={onAddPlace}>
          Agregar
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {places.map((place) => (
          <li key={place.id}>
            <Card>
              <CardBody className="flex items-center justify-between gap-2 pt-3.5">
                <button
                  type="button"
                  onClick={() => onSelectPlace(place.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-gray-900 bg-white">
                    <Icon name={place.icon} size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">
                      {place.label}
                    </span>
                    <span className="block truncate text-xs text-gray-600">
                      {place.address || formatCoords(place.position)}
                    </span>
                  </span>
                </button>
                <Badge variant="outline" title="Peso e ideal para la puntuación">
                  peso {place.scoring.weight} · ideal {formatDuration(place.scoring.idealMin)}
                </Badge>
                <IconButton
                  label={`Editar ${place.label}`}
                  icon={<Pencil size={15} />}
                  size="sm"
                  onClick={() => onEditPlace(place.id)}
                />
                <IconButton
                  label={`Eliminar ${place.label}`}
                  icon={<Trash2 size={15} />}
                  size="sm"
                  onClick={() => setPendingRemoval(place)}
                />
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>

      <Modal
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        title="¿Eliminar este lugar fijo?"
        description={pendingRemoval?.label}
        size="sm"
        footer={
          <>
            <Button onClick={() => setPendingRemoval(null)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingRemoval) onRemovePlace(pendingRemoval.id);
                setPendingRemoval(null);
              }}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Los análisis que ya hiciste quedarán marcados como desactualizados.
        </p>
      </Modal>
    </div>
  );
}
