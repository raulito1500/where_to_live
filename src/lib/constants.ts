import type { LatLng } from '@/types';

export const APP_NAME = 'WhereToLive';

/** Caso de uso inicial: Potsdam (sección 1). Sólo es el centro inicial del mapa. */
export const DEFAULT_MAP_CENTER: LatLng = { lat: 52.3906, lng: 13.0645 };
export const DEFAULT_MAP_ZOOM = 13;

/** Zoom al que se vuela al enfocar un candidato o un lugar. */
export const FOCUS_ZOOM = 15;

/** Precisión peor que esto => aviso "Ubicación poco precisa" (sección 8.8). */
export const POOR_ACCURACY_M = 50;

/** Candidatos comparables a la vez (sección 8.3). */
export const COMPARE_LIMIT = 4;
