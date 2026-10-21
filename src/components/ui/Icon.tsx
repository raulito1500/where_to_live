import type { LucideProps } from 'lucide-react';
import {
  Baby, Bike, Briefcase, Building2, BusFront, Car, Check, ChevronDown, ChevronUp,
  CircleAlert, CircleHelp, Coffee, Copy, Crosshair, Croissant, Dog, Dumbbell,
  ExternalLink, Footprints, GraduationCap, Heart, House, Info, Landmark, Layers,
  Link, ListFilter, Locate, MapPin, Pencil, Pill, Plus, RefreshCw, Scale, Search,
  Settings, ShoppingBag, ShoppingCart, SprayCan, Stethoscope, Store, TrainFront,
  TramFront, Trash2, Trees, TriangleAlert, Users, Utensils, Waves, X,
} from 'lucide-react';

/**
 * Registro explícito de iconos: los datos guardan un nombre (string) y la UI lo
 * resuelve aquí. Evita imports dinámicos y que un nombre inválido rompa la app.
 * Los lugares se distinguen por icono/forma, nunca por color (sección 3).
 */
export const ICON_REGISTRY = {
  Baby, Bike, Briefcase, Building2, BusFront, Car, Check, ChevronDown, ChevronUp,
  CircleAlert, CircleHelp, Coffee, Copy, Crosshair, Croissant, Dog, Dumbbell,
  ExternalLink, Footprints, GraduationCap, Heart, House, Info, Landmark, Layers,
  Link, ListFilter, Locate, MapPin, Pencil, Pill, Plus, RefreshCw, Scale, Search,
  Settings, ShoppingBag, ShoppingCart, SprayCan, Stethoscope, Store, TrainFront,
  TramFront, Trash2, Trees, TriangleAlert, Users, Utensils, Waves, X,
} as const;

export type IconName = keyof typeof ICON_REGISTRY;

/** Nombres ofrecidos al usuario al elegir icono de un lugar fijo o categoría. */
export const PICKABLE_ICONS: IconName[] = [
  'MapPin', 'House', 'GraduationCap', 'Briefcase', 'Building2', 'Heart', 'Users',
  'Baby', 'Dog', 'Landmark', 'Store', 'ShoppingCart', 'ShoppingBag', 'Croissant',
  'Coffee', 'Utensils', 'Pill', 'SprayCan', 'Stethoscope', 'Dumbbell', 'Waves',
  'Trees', 'TrainFront', 'TramFront', 'BusFront', 'Bike', 'Car', 'Footprints',
];

export function isIconName(value: string | undefined): value is IconName {
  return value !== undefined && value in ICON_REGISTRY;
}

export interface IconProps extends Omit<LucideProps, 'ref'> {
  name: string | undefined;
  /** Icono usado si `name` no está en el registro. */
  fallback?: IconName;
}

export function Icon({ name, fallback = 'MapPin', size = 16, ...props }: IconProps) {
  const Component = ICON_REGISTRY[isIconName(name) ? name : fallback];
  return <Component size={size} aria-hidden {...props} />;
}
