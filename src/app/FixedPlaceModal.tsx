import { useEffect, useState } from 'react';
import { AddressSearch, CoordinateInput, FixedPlaceForm } from '@/components/forms';
import { Modal, type IconName } from '@/components/ui';
import { useAddressSearch, useReverseGeocode } from '@/hooks';
import type { FixedPlace, GeocodeResult, LatLng } from '@/types';

export interface FixedPlaceModalProps {
  open: boolean;
  onClose: () => void;
  /** Lugar a editar; sin él, es un alta. */
  editing?: FixedPlace | null;
  onSubmit: (draft: { label: string; icon: IconName; position: LatLng; address: string }) => void;
  searchBias?: LatLng;
}

/** Alta/edición de lugares fijos (sección 8.5) con el mismo buscador del candidato. */
export function FixedPlaceModal({
  open,
  onClose,
  editing = null,
  onSubmit,
  searchBias,
}: FixedPlaceModalProps) {
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<LatLng | null>(null);
  const [chosenLabel, setChosenLabel] = useState('');

  const search = useAddressSearch(query, searchBias);
  const reverse = useReverseGeocode(position && chosenLabel === '' ? position : null);
  const address = chosenLabel || reverse.result?.label || '';

  useEffect(() => {
    if (!open) return;
    setPosition(editing?.position ?? null);
    setChosenLabel(editing?.address ?? '');
    setQuery(editing?.address ?? '');
  }, [open, editing]);

  const onSelectResult = (result: GeocodeResult) => {
    setPosition(result.position);
    setChosenLabel(result.label);
    setQuery(result.label);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar lugar fijo' : 'Nuevo lugar fijo'}
      description="Los sitios a los que vas siempre: se mide cada candidato contra ellos."
      size="md"
    >
      <FixedPlaceForm
        {...(editing ? { initial: editing } : {})}
        position={position}
        address={address}
        locationSlot={
          <div className="flex flex-col gap-3">
            <AddressSearch
              query={query}
              onChangeQuery={setQuery}
              results={search.results}
              isLoading={search.isLoading || search.isTyping}
              isError={search.isError}
              onSelect={onSelectResult}
            />
            <details className="text-sm">
              <summary className="cursor-pointer text-xs font-medium text-gray-700">
                ¿No lo encuentras? Pega un link o coordenadas
              </summary>
              <div className="pt-2">
                <CoordinateInput
                  label="Link o coordenadas"
                  onResolve={(resolved) => {
                    setPosition(resolved);
                    setChosenLabel('');
                  }}
                />
              </div>
            </details>
          </div>
        }
        onSubmit={(draft) => {
          onSubmit(draft);
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
