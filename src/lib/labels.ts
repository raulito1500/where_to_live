import type { TravelMode } from '@/types';

/** Etiquetas de UI en español (el MVP es monolingüe, sección 15). */
export const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
  foot: 'A pie',
  bike: 'En bici',
  car: 'En carro',
  transit: 'Transporte público',
};

export const TRAVEL_MODE_SHORT_LABEL: Record<TravelMode, string> = {
  foot: 'Pie',
  bike: 'Bici',
  car: 'Carro',
  transit: 'Público',
};

/** Icono lucide por modo (sección 8.2: iconos, no emojis). */
export const TRAVEL_MODE_ICON: Record<TravelMode, string> = {
  foot: 'Footprints',
  bike: 'Bike',
  car: 'Car',
  transit: 'TrainFront',
};
