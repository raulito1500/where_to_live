import { useId, useState } from 'react';
import { Search, X } from 'lucide-react';
import { EmptyState, IconButton, Input, Spinner } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { GeocodeResult } from '@/types';

export interface AddressSearchProps {
  query: string;
  onChangeQuery: (query: string) => void;
  results: GeocodeResult[];
  isLoading: boolean;
  isError: boolean;
  onSelect: (result: GeocodeResult) => void;
  selectedId?: string | null;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Buscador de direcciones (sección 8.7). Componente tonto: el debounce y la
 * llamada a Photon viven en `useAddressSearch`.
 */
export function AddressSearch({
  query,
  onChangeQuery,
  results,
  isLoading,
  isError,
  onSelect,
  selectedId = null,
  label = 'Buscar dirección',
  placeholder = 'Calle, número, ciudad…',
  autoFocus = false,
}: AddressSearchProps) {
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) onSelect(result);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        placeholder={placeholder}
        value={query}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(event) => {
          onChangeQuery(event.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
        leadingIcon={<Search size={16} />}
        trailing={
          isLoading ? (
            <Spinner size={14} />
          ) : query !== '' ? (
            <IconButton
              label="Limpiar búsqueda"
              icon={<X size={15} />}
              size="sm"
              className="border-0"
              onClick={() => onChangeQuery('')}
            />
          ) : null
        }
      />

      {isError ? (
        <EmptyState
          tone="notice"
          title="No se pudo buscar"
          description="El servicio de direcciones no respondió. Puedes pegar coordenadas o marcar el punto en el mapa."
          className="py-4"
        />
      ) : null}

      {results.length > 0 ? (
        <ul id={listId} role="listbox" aria-label="Resultados" className="flex flex-col gap-1">
          {results.map((result, index) => (
            <li key={result.id}>
              <button
                type="button"
                role="option"
                aria-selected={result.id === selectedId}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => onSelect(result)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900',
                  index === activeIndex || result.id === selectedId
                    ? 'border-gray-900 bg-gray-50 font-medium text-gray-900'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                )}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
