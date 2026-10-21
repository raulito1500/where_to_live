import type { ProviderId } from './types';

/**
 * Único punto donde se leen las variables `VITE_*`. Nada más en la app toca
 * `import.meta.env`, así los tests y los adaptadores reciben config explícita.
 * Recordatorio (sección 12): las `VITE_*` son visibles en el navegador.
 */
export interface ProviderConfig {
  providerId: ProviderId;
  orsApiKey: string;
  transitBaseUrl: string;
  photonUrl: string;
  nominatimUrl: string;
  overpassUrl: string;
  tileSource: string;
  cartoApiKey: string;
}

const env = import.meta.env as Record<string, string | undefined>;

const read = (key: string, fallback: string): string => {
  const value = env[key];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
};

export const providerConfig: ProviderConfig = {
  providerId: read('VITE_PROVIDER', 'osm') === 'google' ? 'google' : 'osm',
  orsApiKey: read('VITE_ORS_API_KEY', ''),
  transitBaseUrl: read('VITE_TRANSIT_BASE_URL', 'https://v6.vbb.transport.rest'),
  photonUrl: read('VITE_PHOTON_URL', 'https://photon.komoot.io'),
  nominatimUrl: read('VITE_NOMINATIM_URL', 'https://nominatim.openstreetmap.org'),
  overpassUrl: read('VITE_OVERPASS_URL', 'https://overpass-api.de/api/interpreter'),
  tileSource: read('VITE_TILE_SOURCE', 'osm'),
  cartoApiKey: read('VITE_CARTO_API_KEY', ''),
};

/** Para el bloque "Estado de proveedores" de Ajustes (sección 8.6). */
export interface ProviderStatusItem {
  id: string;
  label: string;
  ready: boolean;
  detail: string;
}

export function providerStatus(config: ProviderConfig = providerConfig): ProviderStatusItem[] {
  return [
    {
      id: 'routing',
      label: 'API key de rutas (OpenRouteService)',
      ready: config.orsApiKey !== '',
      detail:
        config.orsApiKey !== ''
          ? 'Configurada: los tiempos a pie, bici y carro son reales.'
          : 'No configurada: los tiempos se estimarán y se marcarán como estimados.',
    },
    {
      id: 'transit',
      label: 'Transporte público (VBB)',
      ready: config.transitBaseUrl !== '',
      detail: `Instancia pública: ${config.transitBaseUrl}. Cubre Berlín-Brandenburg.`,
    },
    {
      id: 'geocoding',
      label: 'Direcciones (Photon / Nominatim)',
      ready: config.photonUrl !== '' && config.nominatimUrl !== '',
      detail: 'Sin API key. Autocompletado con debounce y máx. 1 req/s en reverse.',
    },
    {
      id: 'tiles',
      label: 'Mapa base',
      ready: true,
      detail:
        config.tileSource === 'esri'
          ? 'Esri World Light Gray Canvas, sin API key.'
          : config.tileSource === 'carto' && config.cartoApiKey !== ''
            ? 'CARTO Positron con tu API key.'
            : 'Tiles de OpenStreetMap, sin API key.',
    },
    {
      id: 'places',
      label: 'Lugares cercanos (Overpass)',
      ready: config.overpassUrl !== '',
      detail: `Sin API key. Una consulta por análisis, con espejos de reserva si ${new URL(config.overpassUrl).hostname} falla.`,
    },
  ];
}
