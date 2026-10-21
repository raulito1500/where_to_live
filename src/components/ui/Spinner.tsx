import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SpinnerProps {
  className?: string;
  size?: number;
  /** Texto para lectores de pantalla; el spinner es decorativo sin él. */
  label?: string;
}

export function Spinner({ className, size = 16, label }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <LoaderCircle size={size} aria-hidden className={cn('animate-spin text-gray-500', className)} />
      {label ? <span className="text-sm text-gray-600">{label}</span> : <span className="sr-only">Cargando</span>}
    </span>
  );
}
