import { useState } from 'react';
import { Link } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { parseLocationInput } from '@/lib/parseLocationInput';
import type { LatLng } from '@/types';

export interface CoordinateInputProps {
  onResolve: (position: LatLng) => void;
  label?: string;
}

/**
 * "Pegar link o coordenadas" (sección 8.7). El parseo es una función pura de
 * `lib/parseLocationInput`; aquí sólo se muestra el resultado o el error.
 */
export function CoordinateInput({ onResolve, label = 'Pegar link o coordenadas' }: CoordinateInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const result = parseLocationInput(value);
    if (result.ok) {
      setError(null);
      onResolve(result.position);
      return;
    }
    setError(result.message);
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        placeholder="52.3906, 13.0645"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
        leadingIcon={<Link size={16} />}
        {...(error ? { error } : { hint: 'Acepta coordenadas y links de Google Maps u OpenStreetMap.' })}
      />
      <Button onClick={submit} disabled={value.trim() === ''} className="self-start">
        Usar esta ubicación
      </Button>
    </div>
  );
}
