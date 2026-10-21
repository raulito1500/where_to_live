import { useCallback, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Panel inferior de móvil con 3 alturas (sección 8.8). En Fase 0 se cambia de
 * altura con el asa (clic o teclado); el arrastre con el dedo llega en Fase 5.
 */
export type SheetHeight = 'collapsed' | 'half' | 'full';

const HEIGHT_CLASS: Record<SheetHeight, string> = {
  collapsed: 'h-[26dvh]',
  half: 'h-[55dvh]',
  full: 'h-[88dvh]',
};

const NEXT_UP: Record<SheetHeight, SheetHeight> = {
  collapsed: 'half',
  half: 'full',
  full: 'full',
};

const NEXT_DOWN: Record<SheetHeight, SheetHeight> = {
  full: 'half',
  half: 'collapsed',
  collapsed: 'collapsed',
};

export interface BottomSheetProps {
  height: SheetHeight;
  onChangeHeight: (height: SheetHeight) => void;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ height, onChangeHeight, children, className }: BottomSheetProps) {
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onChangeHeight(NEXT_UP[height]);
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        onChangeHeight(NEXT_DOWN[height]);
      }
    },
    [height, onChangeHeight],
  );

  return (
    <section
      className={cn(
        'pointer-events-auto flex flex-col rounded-t-2xl border-t border-gray-300 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.12)]',
        'transition-[height] duration-200 ease-out',
        HEIGHT_CLASS[height],
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChangeHeight(height === 'full' ? 'collapsed' : NEXT_UP[height])}
        onKeyDown={onKeyDown}
        aria-label={height === 'full' ? 'Contraer el panel' : 'Expandir el panel'}
        className="flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-t-2xl text-gray-500"
      >
        <span className="h-1 w-10 rounded-full bg-gray-300" aria-hidden />
        {height === 'full' ? <ChevronDown size={14} aria-hidden /> : <ChevronUp size={14} aria-hidden />}
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </section>
  );
}
