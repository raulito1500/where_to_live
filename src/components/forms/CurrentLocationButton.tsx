import { Crosshair, TriangleAlert } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import { formatMeters } from '@/lib/format';
import { POOR_ACCURACY_M } from '@/lib/constants';
import type { CurrentLocationError, CurrentLocationStatus } from '@/hooks';

export interface CurrentLocationButtonProps {
  status: CurrentLocationStatus;
  error: CurrentLocationError | null;
  accuracyM: number | null;
  onRequest: () => void;
  /** Botón destacado y a todo el ancho en móvil (sección 8.8). */
  emphasized?: boolean;
}

/**
 * "Usar mi ubicación actual" (sección 8.8), con los tres errores y su
 * "Reintentar". La llamada al navegador está en `useCurrentLocation`.
 */
export function CurrentLocationButton({
  status,
  error,
  accuracyM,
  onRequest,
  emphasized = true,
}: CurrentLocationButtonProps) {
  const poorAccuracy = accuracyM !== null && accuracyM > POOR_ACCURACY_M;

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={emphasized ? 'primary' : 'secondary'}
        size="lg"
        fullWidth={emphasized}
        loading={status === 'requesting'}
        leadingIcon={status === 'requesting' ? undefined : <Crosshair size={18} />}
        onClick={onRequest}
      >
        {status === 'requesting' ? 'Buscando tu ubicación…' : 'Usar mi ubicación actual'}
      </Button>

      {status === 'error' && error ? (
        <EmptyState
          tone="notice"
          icon={<TriangleAlert size={18} />}
          title={error.message}
          description={error.hint}
          action={<Button onClick={onRequest}>Reintentar</Button>}
          className="py-4"
        />
      ) : null}

      {status === 'success' && accuracyM !== null ? (
        poorAccuracy ? (
          <EmptyState
            tone="notice"
            icon={<TriangleAlert size={18} />}
            title="Ubicación poco precisa"
            description={`Margen de ${formatMeters(accuracyM)}. Arrastra el pin hasta la puerta del edificio antes de guardar.`}
            action={<Button onClick={onRequest}>Reintentar</Button>}
            className="py-4"
          />
        ) : (
          <p className="text-xs text-gray-600">
            Precisión de {formatMeters(accuracyM)}. Puedes arrastrar el pin para ajustarlo.
          </p>
        )
      ) : null}
    </div>
  );
}
