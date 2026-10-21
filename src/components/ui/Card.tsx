import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `plain` para tarjetas dentro de otra tarjeta. */
  variant?: 'raised' | 'plain';
  interactive?: boolean;
  selected?: boolean;
}

export function Card({
  variant = 'raised',
  interactive = false,
  selected = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white',
        variant === 'raised' ? 'border-gray-200 shadow-sm' : 'border-gray-200',
        interactive && 'cursor-pointer transition-colors hover:bg-gray-50',
        selected && 'border-gray-900 ring-1 ring-gray-900',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Icono a la izquierda del título. */
  icon?: ReactNode;
  /** Acciones a la derecha (botones de icono). */
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, icon, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-4 pt-3.5 pb-2', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-900 bg-white text-gray-900">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-gray-600">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-4 pt-1 pb-3.5 text-sm text-gray-700', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2 border-t border-gray-200 px-4 py-2.5', className)} {...props}>
      {children}
    </div>
  );
}
