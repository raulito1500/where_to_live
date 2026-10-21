import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
  /** Contador opcional (ej. nº de candidatos). */
  count?: number;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  /** `aria-label` de la barra de pestañas. */
  label: string;
}

/** Componente "tonto": no conoce el contenido, sólo emite el cambio. */
export function Tabs<T extends string = string>({ items, value, onChange, className, label }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex items-stretch gap-1 border-b border-gray-200 px-1', className)}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${item.id}`}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-t-lg border-b-2 px-2.5 text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1',
              selected
                ? 'border-gray-900 font-semibold text-gray-900'
                : 'border-transparent font-medium text-gray-500 hover:text-gray-800',
            )}
          >
            {item.icon}
            <span className="whitespace-nowrap">{item.label}</span>
            {item.count !== undefined ? (
              <span
                className={cn(
                  'rounded px-1 text-xs tabular-nums',
                  selected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  id: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, active, children, className }: TabPanelProps) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={cn('focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
