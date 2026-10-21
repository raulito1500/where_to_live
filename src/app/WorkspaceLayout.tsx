import { useState, type ReactNode } from 'react';
import { useIsDesktop } from '@/hooks';
import { BottomSheet, type SheetHeight } from './BottomSheet';

export interface WorkspaceLayoutProps {
  map: ReactNode;
  panel: ReactNode;
}

/**
 * Layout general (sección 8):
 * - Desktop: mapa a la izquierda (~60%) y panel a la derecha.
 * - Móvil: mapa arriba y panel como bottom sheet de 3 alturas, con el mapa
 *   siempre visible por detrás.
 *
 * El panel se monta UNA sola vez: si se renderizara en las dos ramas ocultando
 * una con CSS, los `id` de las pestañas quedarían duplicados en el documento.
 */
export function WorkspaceLayout({ map, panel }: WorkspaceLayoutProps) {
  const isDesktop = useIsDesktop();
  const [sheetHeight, setSheetHeight] = useState<SheetHeight>('half');

  if (isDesktop) {
    return (
      <div className="flex min-h-0 flex-1 flex-row">
        <div className="relative min-h-0 w-[60%]">{map}</div>
        <aside className="flex min-h-0 w-[40%] flex-col overflow-y-auto border-l border-gray-200">
          {panel}
        </aside>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">{map}</div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500]">
        <BottomSheet height={sheetHeight} onChangeHeight={setSheetHeight}>
          {panel}
        </BottomSheet>
      </div>
    </div>
  );
}
