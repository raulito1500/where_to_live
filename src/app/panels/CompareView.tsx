import { Scale } from 'lucide-react';
import { buildCompareRows, CompareTable } from '@/components/compare';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Select } from '@/components/ui';
import { COMPARE_LIMIT } from '@/lib/constants';
import { TRAVEL_MODE_LABEL } from '@/lib/labels';
import { formatScore } from '@/lib/format';
import type {
  Candidate,
  CandidateScore,
  FixedPlace,
  PlaceCategory,
  TravelMode,
} from '@/types';

export interface CompareViewProps {
  candidates: Candidate[];
  selected: Candidate[];
  scores: Record<string, CandidateScore | null>;
  fixedPlaces: FixedPlace[];
  categories: PlaceCategory[];
  mode: TravelMode;
  onChangeMode: (mode: TravelMode) => void;
  onToggle: (id: string) => void;
  onBack: () => void;
}

/** Vista "Comparar" (sección 8.4): selección de 2–4 candidatos y tabla. */
export function CompareView({
  candidates,
  selected,
  scores,
  fixedPlaces,
  categories,
  mode,
  onChangeMode,
  onToggle,
  onBack,
}: CompareViewProps) {
  if (candidates.length < 2) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4">
        <EmptyState
          icon={<Scale size={22} />}
          title="Necesitas al menos dos candidatos"
          description="Guarda y analiza varias ubicaciones para compararlas lado a lado."
          action={<Button onClick={onBack}>Volver al mapa</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4">
      <Card>
        <CardHeader
          title="Elige qué comparar"
          subtitle={`Entre 2 y ${COMPARE_LIMIT} candidatos · ${selected.length} elegidos`}
          actions={<Button onClick={onBack}>Volver al mapa</Button>}
        />
        <CardBody className="flex flex-wrap gap-1.5">
          {candidates.map((candidate) => {
            const isSelected = selected.some((item) => item.id === candidate.id);
            const full = selected.length >= COMPARE_LIMIT && !isSelected;
            return (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={isSelected}
                disabled={full}
                onClick={() => onToggle(candidate.id)}
                className={
                  isSelected
                    ? 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-900 bg-gray-900 px-2.5 text-sm font-medium text-white'
                    : 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-45'
                }
              >
                <span className="max-w-[12rem] truncate">{candidate.name}</span>
                <span className="tabular-nums opacity-70">
                  {formatScore(scores[candidate.id]?.total)}
                </span>
              </button>
            );
          })}
        </CardBody>
      </Card>

      {selected.length < 2 ? (
        <EmptyState
          title="Elige al menos dos"
          description="Toca los candidatos de arriba para ponerlos en la tabla."
        />
      ) : (
        <Card>
          <CardHeader
            title="Comparación"
            subtitle="El mejor valor de cada fila va en negrita y con fondo más oscuro"
            actions={
              selected.some((candidate) => candidate.analysis === undefined) ? (
                <Badge variant="warning">Alguno sin analizar</Badge>
              ) : null
            }
          />
          <CardBody className="flex flex-col gap-3">
            <Select
              label="Modo de desplazamiento de la tabla"
              value={mode}
              onChange={(event) => onChangeMode(event.target.value as TravelMode)}
              options={Object.entries(TRAVEL_MODE_LABEL).map(([value, label]) => ({
                value,
                label,
              }))}
              containerClassName="max-w-xs"
            />
            <CompareTable
              candidates={selected}
              scores={scores}
              rows={buildCompareRows(selected, fixedPlaces, categories, mode)}
              mode={mode}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
