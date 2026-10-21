import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { AddressSearch, CoordinateInput, CurrentLocationButton } from '@/components/forms';
import { Button, Input, Modal, Spinner, TabPanel, Tabs, type TabItem } from '@/components/ui';
import { useAddressSearch, useReverseGeocode, type UseCurrentLocationResult } from '@/hooks';
import { formatCoords } from '@/lib/format';
import type { GeocodeResult, LatLng } from '@/types';

type EntryTab = 'current' | 'search' | 'map' | 'paste';

const TABS: TabItem<EntryTab>[] = [
  { id: 'current', label: 'Aquí' },
  { id: 'search', label: 'Buscar' },
  { id: 'map', label: 'Mapa' },
  { id: 'paste', label: 'Pegar' },
];

export interface AddLocationSubmit {
  name: string;
  address: string;
  position: LatLng;
}

export interface AddLocationModalProps {
  open: boolean;
  onClose: () => void;
  /** Punto elegido (por mapa, búsqueda, pegado o GPS). */
  position: LatLng | null;
  onChangePosition: (position: LatLng | null) => void;
  /** Cierra el modal y activa el modo "colocar pin" en el mapa. */
  onRequestMapPick: () => void;
  onSubmit: (submit: AddLocationSubmit) => void;
  /** Estado de `useCurrentLocation`, elevado a App para dibujar la precisión. */
  currentLocation: UseCurrentLocationResult;
  /** Centro del mapa: sesga los resultados de búsqueda a la zona visible. */
  searchBias?: LatLng;
  title?: string;
  submitLabel?: string;
}

/**
 * "Agregar ubicación" con las cuatro entradas de la sección 8.7 en un mismo
 * control. Contenedor: conecta los hooks con componentes de `components/forms/`.
 */
export function AddLocationModal({
  open,
  onClose,
  position,
  onChangePosition,
  onRequestMapPick,
  onSubmit,
  currentLocation,
  searchBias,
  title = 'Agregar ubicación',
  submitLabel = 'Guardar y analizar',
}: AddLocationModalProps) {
  const [tab, setTab] = useState<EntryTab>('current');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [chosenLabel, setChosenLabel] = useState('');
  const [nameEdited, setNameEdited] = useState(false);

  const search = useAddressSearch(query, searchBias);
  // Sólo se pide la dirección cuando el punto no vino ya con una.
  const reverse = useReverseGeocode(position && chosenLabel === '' ? position : null);

  const address = chosenLabel || reverse.result?.label || '';

  // Nombre por defecto: la dirección; editable después (sección 8.8).
  useEffect(() => {
    if (!nameEdited && address !== '') setName(address);
  }, [address, nameEdited]);

  useEffect(() => {
    if (currentLocation.position) {
      onChangePosition(currentLocation.position);
      setChosenLabel('');
    }
  }, [currentLocation.position, onChangePosition]);

  const reset = () => {
    setQuery('');
    setName('');
    setChosenLabel('');
    setNameEdited(false);
    onChangePosition(null);
    currentLocation.reset();
  };

  const onSelectResult = (result: GeocodeResult) => {
    onChangePosition(result.position);
    setChosenLabel(result.label);
    setQuery(result.label);
  };

  const canSubmit = position !== null && name.trim() !== '';

  const positionSummary = useMemo(() => {
    if (!position) return null;
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
          <MapPin size={14} aria-hidden />
          Ubicación elegida
        </p>
        <p className="text-sm text-gray-800">
          {reverse.isLoading && address === '' ? (
            <Spinner size={13} label="Buscando la dirección…" />
          ) : (
            (address || 'Sin dirección conocida')
          )}
        </p>
        <p className="text-xs text-gray-600 tabular-nums">{formatCoords(position)}</p>
      </div>
    );
  }, [position, address, reverse.isLoading]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Por GPS, por dirección, marcando en el mapa o pegando un link."
      size="md"
      footer={
        <>
          <Button
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!canSubmit}
            onClick={() => {
              if (!position) return;
              onSubmit({ name: name.trim(), address, position });
              reset();
            }}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Tabs items={TABS} value={tab} onChange={setTab} label="Cómo agregar la ubicación" />

        <TabPanel id="current" active={tab === 'current'}>
          <CurrentLocationButton
            status={currentLocation.status}
            error={currentLocation.error}
            accuracyM={currentLocation.accuracyM}
            onRequest={currentLocation.request}
          />
        </TabPanel>

        <TabPanel id="search" active={tab === 'search'}>
          <AddressSearch
            query={query}
            onChangeQuery={setQuery}
            results={search.results}
            isLoading={search.isLoading || search.isTyping}
            isError={search.isError}
            onSelect={onSelectResult}
            autoFocus
          />
        </TabPanel>

        <TabPanel id="map" active={tab === 'map'}>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-700">
              Cierra este cuadro y toca el punto exacto en el mapa. Después puedes arrastrar el pin
              para ajustarlo.
            </p>
            <Button
              variant="primary"
              leadingIcon={<Search size={16} />}
              onClick={onRequestMapPick}
              className="self-start"
            >
              Marcar en el mapa
            </Button>
          </div>
        </TabPanel>

        <TabPanel id="paste" active={tab === 'paste'}>
          <CoordinateInput
            onResolve={(resolved) => {
              onChangePosition(resolved);
              setChosenLabel('');
            }}
          />
        </TabPanel>

        {positionSummary}

        {position ? (
          <Input
            label="Nombre del candidato"
            placeholder="Apto Babelsberg 2 hab"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameEdited(true);
            }}
            hint="Por defecto usamos la dirección; puedes cambiarlo."
          />
        ) : null}
      </div>
    </Modal>
  );
}
