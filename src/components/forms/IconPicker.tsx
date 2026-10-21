import { Icon, PICKABLE_ICONS, type IconName } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface IconPickerProps {
  value: string | undefined;
  onChange: (icon: IconName) => void;
  label?: string;
}

/** Elegir icono para un lugar fijo o categoría: se distinguen por forma, no por color. */
export function IconPicker({ value, onChange, label = 'Icono' }: IconPickerProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
        {label}
      </legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {PICKABLE_ICONS.map((name) => {
          const selected = name === value;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={name}
              onClick={() => onChange(name)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900',
                selected
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              <Icon name={name} size={17} />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
