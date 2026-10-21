import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'solid' | 'outline' | 'subtle' | 'warning';

/** `warning` se distingue con borde punteado + icono, al tono del diseño gris. */
const VARIANT: Record<BadgeVariant, string> = {
  solid: 'bg-gray-900 text-white border border-gray-900',
  outline: 'bg-white text-gray-800 border border-gray-300',
  subtle: 'bg-gray-100 text-gray-700 border border-gray-100',
  warning: 'bg-white text-gray-900 border border-dashed border-gray-700',
};

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
  title?: string;
}

export function Badge({ variant = 'subtle', icon, className, children, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        VARIANT[variant],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
