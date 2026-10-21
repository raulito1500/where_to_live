import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Jerarquía por contraste y peso tipográfico, no por color (sección 9). */
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-gray-900 text-white hover:bg-gray-800 border border-gray-900',
  secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-700 border border-transparent hover:bg-gray-100',
  // Acción destructiva: se marca con borde grueso y texto, nunca con rojo.
  danger: 'bg-white text-gray-900 border-2 border-dashed border-gray-900 hover:bg-gray-100',
};

const SIZE: Record<ButtonSize, string> = {
  // min-h-11 = 44 px: objetivo táctil mínimo (sección 8.8).
  sm: 'min-h-9 px-2.5 text-xs gap-1.5',
  md: 'min-h-11 px-3.5 text-sm gap-2',
  lg: 'min-h-12 px-4 text-base gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={14} className={variant === 'primary' ? 'text-white' : undefined} /> : leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
});
