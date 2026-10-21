import { useState } from 'react';
import { Check, TriangleAlert } from 'lucide-react';
import { ScoringRuleFields } from '@/components/forms';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  Select,
} from '@/components/ui';
import { useFixedPlaces, useFixedPlacesActions, useSettings, useSettingsActions } from '@/hooks';
import { TRAVEL_MODE_LABEL } from '@/lib/labels';
import { providerStatus } from '@/providers';
import { isPersistenceAvailable, STORAGE_KEYS } from '@/store';
import type { TravelMode } from '@/types';

export interface SettingsViewProps {
  onClearAllData: () => void;
}

/**
 * Ajustes (sección 8.6). En Fase 0 sólo lo que ya tiene datos reales: modo
 * principal, hora de transit, estado de proveedores y borrar datos. El editor de
 * categorías, los pesos y el export/import llegan en Fases 4 y 5.
 */
export function SettingsView({ onClearAllData }: SettingsViewProps) {
  const settings = useSettings();
  const {
    setPrimaryMode,
    setTransitDepartureTime,
    resetCategories,
    updateCategoryScoring,
    toggleCategory,
    setDensityThresholds,
  } = useSettingsActions();
  const fixedPlaces = useFixedPlaces();
  const { updatePlaceScoring } = useFixedPlacesActions();
  const [confirmClear, setConfirmClear] = useState(false);
  const status = providerStatus();
  const enabledCount = settings.categories.filter((category) => category.enabled).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4">
      <Card>
        <CardHeader title="Desplazamiento" subtitle="Cómo te mueves normalmente" />
        <CardBody className="flex flex-col gap-3">
          <Select
            label="Modo principal"
            hint="Se destaca en las tarjetas y se usa para puntuar los lugares fijos."
            value={settings.primaryMode}
            onChange={(event) => setPrimaryMode(event.target.value as TravelMode)}
            options={Object.entries(TRAVEL_MODE_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <Input
            label="Hora de referencia (transporte público)"
            type="time"
            hint="Se consulta el próximo día laboral a esta hora."
            value={settings.transitDepartureTime}
            onChange={(event) => setTransitDepartureTime(event.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Categorías"
          subtitle={`${enabledCount} activas de ${settings.categories.length} · toca para activar o desactivar`}
        />
        <CardBody>
          <ul className="flex flex-wrap gap-1.5">
            {settings.categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  aria-pressed={category.enabled}
                  onClick={() => toggleCategory(category.id)}
                  className={
                    category.enabled
                      ? 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-900 bg-gray-900 px-2.5 text-xs font-medium text-white'
                      : 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-gray-600 hover:bg-gray-50'
                  }
                >
                  {category.label}
                  <span className="tabular-nums opacity-70">
                    {category.radiusM >= 1000
                      ? `${category.radiusM / 1000} km`
                      : `${category.radiusM} m`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-600">
            Cambiar el radio y crear categorías propias: Fase 5.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Prioridades y puntuación"
          subtitle="Cuánto pesa cada cosa y a partir de qué tiempo deja de servir"
          actions={
            <Button size="sm" onClick={resetCategories}>
              Restaurar
            </Button>
          }
        />
        <CardBody className="flex flex-col gap-4">
          <p className="text-xs text-gray-600">
            Los cambios se aplican al instante: la puntuación se recalcula con el análisis que ya
            tienes, sin volver a consultar ningún servicio.
          </p>

          <section>
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-gray-700 uppercase">
              Lugares fijos
            </h3>
            {fixedPlaces.length === 0 ? (
              <EmptyState
                title="Aún no hay lugares fijos"
                description="Agrégalos desde el panel para ajustar su importancia."
                className="py-4"
              />
            ) : (
              fixedPlaces.map((place) => (
                <ScoringRuleFields
                  key={place.id}
                  label={place.label}
                  {...(place.icon ? { icon: place.icon } : {})}
                  rule={place.scoring}
                  kind="time"
                  modeLabel={TRAVEL_MODE_LABEL[settings.primaryMode].toLowerCase()}
                  onChange={(patch) => updatePlaceScoring(place.id, patch)}
                />
              ))
            )}
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-gray-700 uppercase">
              Categorías
            </h3>
            {settings.categories.map((category) => (
              <ScoringRuleFields
                key={category.id}
                label={category.label}
                icon={category.icon}
                rule={category.scoring}
                kind={category.kind === 'density' ? 'count' : 'time'}
                modeLabel={
                  category.kind === 'density'
                    ? `en ${category.radiusM} m`
                    : TRAVEL_MODE_LABEL[category.scoringMode].toLowerCase()
                }
                onChange={(patch) => updateCategoryScoring(category.id, patch)}
              />
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
              Umbrales de densidad
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Bajo por debajo de"
                type="number"
                min={0}
                value={settings.densityThresholds.low}
                onChange={(event) =>
                  setDensityThresholds({
                    ...settings.densityThresholds,
                    low: Number(event.target.value),
                  })
                }
              />
              <Input
                label="Alto por encima de"
                type="number"
                min={0}
                value={settings.densityThresholds.high}
                onChange={(event) =>
                  setDensityThresholds({
                    ...settings.densityThresholds,
                    high: Number(event.target.value),
                  })
                }
              />
            </div>
          </section>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Estado de proveedores" subtitle="Servicios de datos configurados" />
        <CardBody>
          <ul className="flex flex-col divide-y divide-gray-200">
            {status.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <span className="mt-0.5 text-gray-700">
                  {item.ready ? <Check size={15} aria-hidden /> : <TriangleAlert size={15} aria-hidden />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">
                    {item.label}
                    <span className="sr-only">{item.ready ? ': configurado' : ': sin configurar'}</span>
                  </span>
                  <span className="block text-xs text-gray-600">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Datos" subtitle="Todo se guarda en este navegador, sin servidor" />
        <CardBody className="flex flex-col gap-3">
          <p className="text-xs text-gray-600">
            {isPersistenceAvailable
              ? `Guardado en localStorage con las claves ${STORAGE_KEYS.settings.replace(':settings', ':*')}.`
              : 'Este navegador bloquea el almacenamiento local: los datos se perderán al recargar.'}
          </p>
          <p className="text-xs text-gray-600">Exportar e importar JSON: Fase 5.</p>
          <Button variant="danger" onClick={() => setConfirmClear(true)} className="self-start">
            Borrar todos mis datos
          </Button>
        </CardBody>
      </Card>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="¿Borrar todos los datos?"
        description="Se eliminan los candidatos, los lugares fijos y los ajustes de este navegador. No se puede deshacer."
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirmClear(false)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                onClearAllData();
                setConfirmClear(false);
              }}
            >
              Sí, borrar todo
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Si querías guardar una copia, espera a la Fase 5 (exportar JSON) o copia el contenido de
          localStorage manualmente.
        </p>
      </Modal>
    </div>
  );
}
