import type { LatLng } from '@/types';
import { isValidLatLng } from './geo';

/**
 * Parser del campo "pegar link o coordenadas" (sección 8.7).
 * Función pura y sin red: se puede probar entera.
 */
export type ParseLocationResult =
  | { ok: true; position: LatLng; source: LocationSource }
  | { ok: false; reason: ParseFailureReason; message: string };

export type LocationSource = 'coords' | 'google' | 'osm' | 'geo-uri';

export type ParseFailureReason = 'empty' | 'short-link' | 'out-of-range' | 'unrecognized';

const SHORT_LINK_HOSTS = ['maps.app.goo.gl', 'goo.gl/maps', 'g.co/kgs'];

const MESSAGES: Record<ParseFailureReason, string> = {
  empty: 'Escribe unas coordenadas o pega un link.',
  // Los acortadores necesitan seguir una redirección, y el navegador no puede
  // hacerlo desde otra página por CORS.
  'short-link':
    'Los links cortos de Google Maps no se pueden abrir desde el navegador. Ábrelo en Maps, mantén pulsado el punto y copia las coordenadas.',
  'out-of-range': 'Esas coordenadas están fuera de rango (latitud ±90, longitud ±180).',
  unrecognized:
    'No reconocí ese formato. Prueba con "52.3906, 13.0645" o con un link de Google Maps u OpenStreetMap.',
};

const fail = (reason: ParseFailureReason): ParseLocationResult => ({
  ok: false,
  reason,
  message: MESSAGES[reason],
});

const build = (lat: number, lng: number, source: LocationSource): ParseLocationResult => {
  const position = { lat, lng };
  if (!isValidLatLng(position)) return fail('out-of-range');
  return { ok: true, position, source };
};

/** "52.3906, 13.0645" y variantes con espacios, punto y coma o coma decimal. */
const PLAIN_COORDS = /^\s*(-?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/;

const toNumber = (raw: string): number => Number.parseFloat(raw.replace(',', '.'));

/**
 * Ojo con la coma decimal: "52,3906, 13,0645" es ambiguo. Sólo se interpreta
 * como par de coordenadas si hay exactamente dos números tras separar.
 */
function parsePlainCoords(input: string): ParseLocationResult | null {
  const match = PLAIN_COORDS.exec(input);
  if (match?.[1] !== undefined && match[2] !== undefined) {
    return build(toNumber(match[1]), toNumber(match[2]), 'coords');
  }
  const parts = input.split(',').map((part) => part.trim());
  if (parts.length === 4 && parts.every((part) => /^-?\d+$/.test(part))) {
    // "52,3906, 13,0645" => coma decimal en ambos números.
    return build(
      Number.parseFloat(`${parts[0]}.${parts[1]}`),
      Number.parseFloat(`${parts[2]}.${parts[3]}`),
      'coords',
    );
  }
  return null;
}

function parseGoogle(url: URL): ParseLocationResult | null {
  // .../@52.3906,13.0645,15z
  const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url.href);
  if (at?.[1] !== undefined && at[2] !== undefined) {
    return build(Number.parseFloat(at[1]), Number.parseFloat(at[2]), 'google');
  }
  // ?q=52.3906,13.0645 · ?query= · ?ll= · ?destination= · !3d..!4d..
  for (const key of ['q', 'query', 'll', 'destination', 'center', 'sll']) {
    const value = url.searchParams.get(key);
    const pair = value ? PLAIN_COORDS.exec(value) : null;
    if (pair?.[1] !== undefined && pair[2] !== undefined) {
      return build(toNumber(pair[1]), toNumber(pair[2]), 'google');
    }
  }
  const bang = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(url.href);
  if (bang?.[1] !== undefined && bang[2] !== undefined) {
    return build(Number.parseFloat(bang[1]), Number.parseFloat(bang[2]), 'google');
  }
  return null;
}

function parseOsm(url: URL): ParseLocationResult | null {
  // ?mlat=52.3906&mlon=13.0645 es el marcador que el usuario compartió, así que
  // gana sobre #map=, que sólo describe el encuadre del mapa (menos preciso).
  const mlat = url.searchParams.get('mlat');
  const mlon = url.searchParams.get('mlon');
  if (mlat && mlon) {
    return build(Number.parseFloat(mlat), Number.parseFloat(mlon), 'osm');
  }
  // #map=15/52.3906/13.0645
  const hash = /map=\d+(?:\.\d+)?\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/.exec(url.hash);
  if (hash?.[1] !== undefined && hash[2] !== undefined) {
    return build(Number.parseFloat(hash[1]), Number.parseFloat(hash[2]), 'osm');
  }
  return null;
}

export function parseLocationInput(input: string): ParseLocationResult {
  const trimmed = input.trim();
  if (trimmed === '') return fail('empty');

  const plain = parsePlainCoords(trimmed);
  if (plain) return plain;

  // geo:52.3906,13.0645 (links de apps de mapas en móvil)
  const geoUri = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i.exec(trimmed);
  if (geoUri?.[1] !== undefined && geoUri[2] !== undefined) {
    return build(Number.parseFloat(geoUri[1]), Number.parseFloat(geoUri[2]), 'geo-uri');
  }

  if (SHORT_LINK_HOSTS.some((host) => trimmed.includes(host))) return fail('short-link');

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return fail('unrecognized');
  }

  const host = url.hostname.toLowerCase();
  if (host.includes('google.')) {
    const result = parseGoogle(url);
    if (result) return result;
  }
  if (host.includes('openstreetmap.') || host.includes('osm.org')) {
    const result = parseOsm(url);
    if (result) return result;
  }

  // Último intento: cualquier link con un par de coordenadas reconocible.
  return parseGoogle(url) ?? parseOsm(url) ?? fail('unrecognized');
}
