import { Plus, Scale, Settings } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';
import type { ViewId } from './routes';

export interface TopBarProps {
  view: ViewId;
  onChangeView: (view: ViewId) => void;
  onNewCandidate: () => void;
  candidateCount: number;
}

/** Barra superior (sección 8): nombre, "Nuevo candidato", Comparar y Ajustes. */
export function TopBar({ view, onChangeView, onNewCandidate, candidateCount }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2">
      <button
        type="button"
        onClick={() => onChangeView('workspace')}
        className="flex min-h-11 items-center gap-2 rounded-lg px-1 text-left"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-xs font-bold text-white">
          W
        </span>
        <span className="text-sm font-semibold tracking-tight text-gray-900">{APP_NAME}</span>
      </button>

      <div className="flex items-center gap-1.5">
        <Button
          variant="primary"
          size="md"
          leadingIcon={<Plus size={16} />}
          onClick={onNewCandidate}
          className="hidden sm:inline-flex"
        >
          Nuevo candidato
        </Button>
        <IconButton
          label="Nuevo candidato"
          icon={<Plus size={18} />}
          onClick={onNewCandidate}
          className="sm:hidden"
        />
        <IconButton
          label={`Comparar candidatos (${candidateCount})`}
          icon={<Scale size={18} />}
          active={view === 'compare'}
          onClick={() => onChangeView(view === 'compare' ? 'workspace' : 'compare')}
        />
        <IconButton
          label="Ajustes"
          icon={<Settings size={18} />}
          active={view === 'settings'}
          onClick={() => onChangeView(view === 'settings' ? 'workspace' : 'settings')}
        />
      </div>
    </header>
  );
}
