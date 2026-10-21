import type { TileSource } from './types';

/**
 * Fuentes de tiles (sección 4 de la spec). El mapa conserva sus colores: el
 * diseño gris es de la interfaz, no del mapa.
 *
 * Por defecto los tiles estándar de OpenStreetMap, que no piden API key.
 */
export type TileSourceId = 'osm' | 'carto' | 'esri';

/**
 * Tiles oficiales de OpenStreetMap. Sin API key. Su política de uso prohíbe el
 * tráfico intensivo: bien para uso personal, no para desplegar a mucha gente.
 */
export const OSM_STANDARD: TileSource = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

/**
 * Esri World Light Gray Canvas: mapa base muy apagado, sin API key. Útil si
 * prefieres que el mapa no compita con los marcadores.
 */
export const ESRI_LIGHT_GRAY: TileSource = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 16,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; Esri, HERE, Garmin',
};

/** CARTO Positron: base clara y sobria, pero desde 2025 necesita API key propia. */
export function cartoPositron(apiKey: string): TileSource {
  return {
    url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?api_key=${apiKey}`,
    subdomains: 'abcd',
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  };
}

export interface TileSelection {
  source: string;
  cartoApiKey: string;
}

export function selectTileSource({ source, cartoApiKey }: TileSelection): TileSource {
  if (source === 'esri') return ESRI_LIGHT_GRAY;
  // Pedir CARTO sin key dejaría el mapa con la marca de agua: se ignora.
  if (source === 'carto' && cartoApiKey !== '') return cartoPositron(cartoApiKey);
  return OSM_STANDARD;
}
