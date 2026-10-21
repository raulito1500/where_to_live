import { useState, type ReactNode } from 'react';
import { Button, EmptyState, Input, type IconName } from '@/components/ui';
import { formatCoords } from '@/lib/format';
import type { FixedPlace, LatLng } from '@/types';
import { IconPicker } from './IconPicker';

export interface FixedPlaceDraft {
  label: string;
  icon: IconName;
  position: LatLng | null;
  address: string;
}

export interface FixedPlaceFormProps {
  initial?: FixedPlace;
  /** Ubicación elegida en el buscador/mapa, inyectada por el contenedor. */
  position: LatLng | null;
  address: string;
  /** Buscador de direcciones (u otro selector) compuesto por el contenedor. */
  locationSlot: ReactNode;
  onSubmit: (draft: { label: string; icon: IconName; position: LatLng; address: string }) => void;
  onCancel: () => void;
}

/**
 * Alta y edición de un lugar fijo (sección 8.5). Presentacional: no busca
 * direcciones ni escribe en la store.
 */
export function FixedPlaceForm({
  initial,
  position,
  address,
  locationSlot,
  onSubmit,
  onCancel,
}: FixedPlaceFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [icon, setIcon] = useState<IconName>((initial?.icon as IconName) ?? 'MapPin');
  const [touched, setTouched] = useState(false);

  const labelError = touched && label.trim() === '' ? 'Ponle un nombre, por ejemplo "Universidad".' : undefined;
  const canSubmit = label.trim() !== '' && position !== null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (!canSubmit || !position) return;
        onSubmit({ label: label.trim(), icon, position, address });
      }}
    >
      <Input
        label="Nombre"
        placeholder="Universidad, Trabajo de Ana…"
        value={label}
        autoFocus
        onChange={(event) => setLabel(event.target.value)}
        onBlur={() => setTouched(true)}
        {...(labelError ? { error: labelError } : {})}
      />

      <div className="flex flex-col gap-2">
        {locationSlot}
        {position ? (
          <p className="text-xs text-gray-600">
            <span className="font-medium text-gray-900">{address || 'Punto elegido'}</span>{' '}
            <span className="tabular-nums">({formatCoords(position)})</span>
          </p>
        ) : touched ? (
          <EmptyState
            tone="notice"
            title="Falta la ubicación"
            description="Busca la dirección o pega unas coordenadas."
            className="py-4"
          />
        ) : null}
      </div>

      <IconPicker value={icon} onChange={setIcon} />

      <div className="flex items-center justify-end gap-2">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {initial ? 'Guardar cambios' : 'Agregar lugar fijo'}
        </Button>
      </div>
    </form>
  );
}
