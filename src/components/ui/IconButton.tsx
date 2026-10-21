import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type IconButtonSize = 'sm' | 'md';

const SIZE: Record<IconButtonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11', // 44 px táctil
};

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Obligatorio: todo botón de icono necesita nombre accesible (sección 9). */
  label: string;
  icon: ReactNode;
  size?: IconButtonSize;
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = 'md', active = false, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={props['aria-pressed'] ?? (active || undefined)}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-45',
        active
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        SIZE[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
