import { describe, expect, it } from 'vitest';
import { ESRI_LIGHT_GRAY, OSM_STANDARD, selectTileSource } from './tiles';

describe('selectTileSource', () => {
  it('usa OSM por defecto (sin API key)', () => {
    expect(selectTileSource({ source: 'osm', cartoApiKey: '' })).toBe(OSM_STANDARD);
  });

  it('ignora CARTO sin key: si no, el mapa saldría con la marca de agua', () => {
    expect(selectTileSource({ source: 'carto', cartoApiKey: '' })).toBe(OSM_STANDARD);
  });

  it('usa CARTO cuando sí hay key', () => {
    const tiles = selectTileSource({ source: 'carto', cartoApiKey: 'abc123' });
    expect(tiles.url).toContain('cartocdn.com');
    expect(tiles.url).toContain('api_key=abc123');
  });

  it('permite Esri como base alternativa sin key', () => {
    expect(selectTileSource({ source: 'esri', cartoApiKey: '' })).toBe(ESRI_LIGHT_GRAY);
  });

  it('cae a OSM ante un valor desconocido', () => {
    expect(selectTileSource({ source: 'lo-que-sea', cartoApiKey: '' })).toBe(OSM_STANDARD);
  });

  it('toda fuente mantiene la atribución de OpenStreetMap', () => {
    for (const source of ['osm', 'esri', 'carto']) {
      const tiles = selectTileSource({ source, cartoApiKey: 'k' });
      expect(tiles.attribution).toContain('OpenStreetMap');
    }
  });
});
