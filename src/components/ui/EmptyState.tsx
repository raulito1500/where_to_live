import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** `notice` para errores y avisos: borde punteado + icono, sin color (sección 9). */
  tone?: 'empty' | 'notice';
}

export function EmptyState({ icon, title, description, action, className, tone = 'empty' }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg px-4 py-8 text-center',
        tone === 'notice' ? 'border-2 border-dashed border-gray-400 bg-gray-50' : 'border border-gray-200 bg-gray-50',
        className,
      )}
    >
      {icon ? <span className="text-gray-500">{icon}</span> : null}
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {description ? <div className="max-w-sm text-xs text-gray-600">{description}</div> : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  );
}
