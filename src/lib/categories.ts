import type { PlaceCategory, ScoringRule, TravelMode } from '@/types';

/** Regla por defecto para lugares fijos (sección 7.1). */
export const DEFAULT_FIXED_PLACE_SCORING: ScoringRule = { weight: 5, idealMin: 15, maxMin: 60 };

/** Umbrales por defecto de las categorías `density`: <5 bajo, 5–20 medio, >20 alto. */
export const DEFAULT_DENSITY_THRESHOLDS = { low: 5, high: 20 };

export const DEFAULT_PRIMARY_MODE: TravelMode = 'foot';
export const DEFAULT_TRANSIT_DEPARTURE_TIME = '08:00';

const rule = (weight: number, idealMin: number, maxMin: number): ScoringRule => ({
  weight,
  idealMin,
  maxMin,
});

/**
 * Categorías por defecto (tabla de la sección 5) con los pesos y umbrales de la
 * sección 7.1. `osmFilters` son fragmentos de filtro Overpass tal cual.
 */
export const DEFAULT_CATEGORIES: PlaceCategory[] = [
  {
    id: 'supermarket',
    label: 'Supermercado',
    icon: 'ShoppingCart',
    enabled: true,
    kind: 'nearest',
    radiusM: 2000,
    osmFilters: ['["shop"="supermarket"]'],
    scoring: rule(4, 5, 20),
    scoringMode: 'foot',
  },
  {
    id: 'chemist',
    label: 'Drogería',
    icon: 'SprayCan',
    enabled: true,
    kind: 'nearest',
    radiusM: 2000,
    osmFilters: ['["shop"="chemist"]'],
    scoring: rule(1, 8, 25),
    scoringMode: 'foot',
  },
  {
    id: 'pharmacy',
    label: 'Farmacia',
    icon: 'Pill',
    enabled: true,
    kind: 'nearest',
    radiusM: 2000,
    osmFilters: ['["amenity"="pharmacy"]'],
    scoring: rule(1, 8, 25),
    scoringMode: 'foot',
  },
  {
    id: 'bakery',
    label: 'Panadería',
    icon: 'Croissant',
    enabled: true,
    kind: 'nearest',
    radiusM: 1500,
    osmFilters: ['["shop"="bakery"]'],
    scoring: rule(1, 5, 20),
    scoringMode: 'foot',
  },
  {
    id: 'park',
    label: 'Parque',
    icon: 'Trees',
    enabled: true,
    kind: 'nearest',
    radiusM: 2500,
    osmFilters: ['["leisure"="park"]'],
    scoring: rule(3, 8, 25),
    scoringMode: 'foot',
  },
  {
    id: 'gym',
    label: 'Gimnasio',
    icon: 'Dumbbell',
    enabled: true,
    kind: 'nearest',
    radiusM: 3000,
    osmFilters: ['["leisure"="fitness_centre"]'],
    scoring: rule(2, 10, 30),
    scoringMode: 'bike',
  },
  {
    id: 'swimming-pool',
    label: 'Piscina pública',
    icon: 'Waves',
    enabled: true,
    kind: 'nearest',
    radiusM: 5000,
    osmFilters: [
      '["leisure"="swimming_pool"]["access"!="private"]',
      '["leisure"="sports_centre"]["sport"="swimming"]',
    ],
    scoring: rule(2, 15, 40),
    scoringMode: 'bike',
  },
  {
    id: 'mall',
    label: 'Centro comercial',
    icon: 'ShoppingBag',
    enabled: true,
    kind: 'nearest',
    radiusM: 6000,
    osmFilters: ['["shop"="mall"]'],
    scoring: rule(1, 15, 40),
    scoringMode: 'car',
  },
  {
    id: 'train-station',
    label: 'Estación de tren',
    icon: 'TrainFront',
    enabled: true,
    kind: 'nearest',
    radiusM: 5000,
    osmFilters: ['["railway"="station"]', '["railway"="halt"]'],
    scoring: rule(4, 10, 30),
    scoringMode: 'foot',
  },
  {
    id: 'tram-stop',
    label: 'Parada de tranvía',
    icon: 'TramFront',
    enabled: true,
    kind: 'nearest',
    radiusM: 1500,
    osmFilters: ['["railway"="tram_stop"]'],
    scoring: rule(3, 3, 10),
    scoringMode: 'foot',
  },
  {
    id: 'bus-stop',
    label: 'Parada de bus',
    icon: 'BusFront',
    enabled: true,
    kind: 'nearest',
    radiusM: 1000,
    osmFilters: ['["highway"="bus_stop"]'],
    scoring: rule(3, 3, 10),
    scoringMode: 'foot',
  },
  {
    id: 'restaurants',
    label: 'Zona de restaurantes',
    icon: 'Utensils',
    enabled: true,
    kind: 'density',
    radiusM: 600,
    osmFilters: ['["amenity"="restaurant"]'],
    // En `density`: idealMin = conteo ideal (100 pts), maxMin = conteo mínimo (0 pts).
    scoring: rule(2, 20, 0),
    scoringMode: 'foot',
  },
  {
    id: 'cafes',
    label: 'Cafés',
    icon: 'Coffee',
    enabled: true,
    kind: 'density',
    radiusM: 600,
    osmFilters: ['["amenity"="cafe"]'],
    scoring: rule(1, 10, 0),
    scoringMode: 'foot',
  },
  {
    id: 'healthcare',
    label: 'Médico / hospital',
    icon: 'Stethoscope',
    enabled: true,
    kind: 'nearest',
    radiusM: 4000,
    osmFilters: ['["amenity"="doctors"]', '["amenity"="clinic"]', '["amenity"="hospital"]'],
    scoring: rule(1, 10, 30),
    scoringMode: 'bike',
  },
];

/** Copia profunda de los defaults (las stores no deben mutar la constante). */
export function defaultCategories(): PlaceCategory[] {
  return DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    osmFilters: [...category.osmFilters],
    scoring: { ...category.scoring },
  }));
}
