import { Icon, type TabItem } from '@/components/ui';

/**
 * Modelo de navegación de la app. No se usa un router: el MVP es una sola
 * pantalla con vistas y pestañas (sección 8), así que basta esta tabla.
 * Cambiar a react-router más adelante sólo toca este archivo y `App.tsx`.
 */
export type ViewId = 'workspace' | 'compare' | 'settings';
export type PanelTabId = 'summary' | 'candidates' | 'fixedPlaces';

export const PANEL_TABS: TabItem<PanelTabId>[] = [
  { id: 'summary', label: 'Resumen', icon: <Icon name="Info" size={15} /> },
  { id: 'candidates', label: 'Candidatos', icon: <Icon name="Layers" size={15} /> },
  { id: 'fixedPlaces', label: 'Lugares fijos', icon: <Icon name="MapPin" size={15} /> },
];

export const VIEW_TITLE: Record<ViewId, string> = {
  workspace: 'Mapa y panel',
  compare: 'Comparar candidatos',
  settings: 'Ajustes',
};
