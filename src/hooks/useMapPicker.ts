import { useCallback, useState } from 'react';
import type { LatLng } from '@/types';

/**
 * Modo "colocar pin" (sección 8.7): activa el clic en el mapa y guarda el punto
 * elegido, que después es arrastrable para ajustarlo.
 */
export interface UseMapPickerResult {
  picking: boolean;
  picked: LatLng | null;
  start: () => void;
  cancel: () => void;
  pick: (position: LatLng) => void;
  move: (position: LatLng) => void;
}

export function useMapPicker(onPick?: (position: LatLng) => void): UseMapPickerResult {
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<LatLng | null>(null);

  const start = useCallback(() => setPicking(true), []);

  const cancel = useCallback(() => {
    setPicking(false);
    setPicked(null);
  }, []);

  const pick = useCallback(
    (position: LatLng) => {
      setPicked(position);
      setPicking(false);
      onPick?.(position);
    },
    [onPick],
  );

  /** Arrastrar el pin ya colocado: ajusta sin volver al modo de selección. */
  const move = useCallback(
    (position: LatLng) => {
      setPicked(position);
      onPick?.(position);
    },
    [onPick],
  );

  return { picking, picked, start, cancel, pick, move };
}
