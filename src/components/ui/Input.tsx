import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const FIELD_BASE =
  'w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 ' +
  'focus:border-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

function FieldShell({ id, label, hint, error, children, className }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-gray-900">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-gray-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  /** Icono decorativo dentro del campo (ej. lupa). */
  leadingIcon?: ReactNode;
  /** Slot a la derecha (ej. botón de limpiar o spinner). */
  trailing?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leadingIcon, trailing, className, containerClassName, id, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={containerClassName}>
      <div className="relative flex items-center">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 text-gray-500">{leadingIcon}</span>
        ) : null}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(
            FIELD_BASE,
            'h-11',
            leadingIcon && 'pl-9',
            trailing && 'pr-10',
            error && 'border-2 border-gray-900',
            className,
          )}
          {...props}
        />
        {trailing ? <span className="absolute right-2 flex items-center">{trailing}</span> : null}
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, containerClassName, id, rows = 3, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={containerClassName}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(FIELD_BASE, 'resize-y py-2.5', error && 'border-2 border-gray-900', className)}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, className, containerClassName, id, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={containerClassName}>
      <select
        ref={ref}
        id={fieldId}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(FIELD_BASE, 'h-11 pr-8', className)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});
