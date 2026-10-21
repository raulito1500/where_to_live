import { useState } from 'react';
import { Copy, Layers, Plus, RefreshCw, Scale, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  IconButton,
  Modal,
  Select,
} from '@/components/ui';
import { formatCoords, formatScore } from '@/lib/format';
import type { CandidateSort } from '@/hooks';
import type { Candidate, CandidateScore } from '@/types';

export interface CandidatesPanelProps {
  candidates: Candidate[];
  activeId: string | null;
  /** Puntuaciones en vivo: se recalculan al cambiar pesos (sección 7.1). */
  scores: Record<string, CandidateScore | null>;
  compareIds: string[];
  sort: CandidateSort;
  onChangeSort: (sort: CandidateSort) => void;
  onSelect: (id: string) => void;
  onAddCandidate: () => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAnalyze: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onOpenCompare: () => void;
}

/** Pestaña "Candidatos" (sección 8.3). Comparar y duplicar llegan en Fase 4. */
export function CandidatesPanel({
  candidates,
  activeId,
  scores,
  compareIds,
  sort,
  onChangeSort,
  onSelect,
  onAddCandidate,
  onRemove,
  onDuplicate,
  onAnalyze,
  onToggleCompare,
  onOpenCompare,
}: CandidatesPanelProps) {
  const [pendingRemoval, setPendingRemoval] = useState<Candidate | null>(null);

  if (candidates.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={22} />}
        title="Sin candidatos guardados"
        description="Cada ubicación que analices se guarda aquí para compararla después."
        action={
          <Button variant="primary" leadingIcon={<Plus size={16} />} onClick={onAddCandidate}>
            Nuevo candidato
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {candidates.length >= 2 ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
          <p className="text-xs text-gray-600">
            {compareIds.length === 0
              ? 'Marca 2 a 4 candidatos para compararlos.'
              : `${compareIds.length} marcados para comparar.`}
          </p>
          <Button
            size="sm"
            variant={compareIds.length >= 2 ? 'primary' : 'secondary'}
            leadingIcon={<Scale size={14} />}
            onClick={onOpenCompare}
          >
            Comparar
          </Button>
        </div>
      ) : null}

      <Select
        label="Ordenar por"
        value={sort}
        onChange={(event) => onChangeSort(event.target.value as CandidateSort)}
        options={[
          { value: 'score', label: 'Puntuación' },
          { value: 'createdAt', label: 'Más reciente' },
          { value: 'name', label: 'Nombre' },
        ]}
      />

      <ul className="flex flex-col gap-2">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <Card selected={candidate.id === activeId}>
              <CardBody className="flex items-center gap-2 pt-3.5">
                <input
                  type="checkbox"
                  checked={compareIds.includes(candidate.id)}
                  onChange={() => onToggleCompare(candidate.id)}
                  aria-label={`Comparar ${candidate.name}`}
                  className="h-4 w-4 shrink-0 accent-gray-900"
                />
                <button
                  type="button"
                  onClick={() => onSelect(candidate.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-semibold text-gray-900">
                    {candidate.name}
                  </span>
                  <span className="block truncate text-xs text-gray-600">
                    {candidate.address || formatCoords(candidate.position)}
                  </span>
                </button>

                {candidate.stale ? <Badge variant="warning">Desact.</Badge> : null}
                <Badge variant={scores[candidate.id] ? 'solid' : 'outline'}>
                  {formatScore(scores[candidate.id]?.total)}
                </Badge>
                <IconButton
                  label={`Recalcular ${candidate.name}`}
                  icon={<RefreshCw size={15} />}
                  size="sm"
                  onClick={() => onAnalyze(candidate.id)}
                />
                <IconButton
                  label={`Duplicar ${candidate.name}`}
                  icon={<Copy size={15} />}
                  size="sm"
                  onClick={() => onDuplicate(candidate.id)}
                />
                <IconButton
                  label={`Eliminar ${candidate.name}`}
                  icon={<Trash2 size={15} />}
                  size="sm"
                  onClick={() => setPendingRemoval(candidate)}
                />
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>

      <Modal
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        title="¿Eliminar este candidato?"
        description={pendingRemoval?.name}
        size="sm"
        footer={
          <>
            <Button onClick={() => setPendingRemoval(null)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingRemoval) onRemove(pendingRemoval.id);
                setPendingRemoval(null);
              }}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Se borran también sus notas y su análisis. No se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
