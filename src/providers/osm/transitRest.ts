import type { LatLng, TravelInfo } from '@/types';
import type { TransitProvider } from '../types';
import { fetchJson } from './http';

/**
 * transport.rest (instancia VBB): transporte público en Berlín-Brandenburg
 * (sección 4). Instancia pública sin garantía: si falla, el bloque de transit
 * se marca como no disponible y el resto del análisis sigue.
 */
interface TransitLeg {
  departure?: string;
  plannedDeparture?: string;
  arrival?: string;
  plannedArrival?: string;
  walking?: boolean;
  distance?: number;
}

interface TransitJourney {
  legs?: TransitLeg[];
}

interface TransitResponse {
  journeys?: TransitJourney[];
}

const timeOf = (value: string | undefined): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

export function mapJourney(journey: TransitJourney): TravelInfo | null {
  const legs = journey.legs ?? [];
  if (legs.length === 0) return null;

  const start = timeOf(legs[0]?.departure ?? legs[0]?.plannedDeparture);
  const lastLeg = legs[legs.length - 1];
  const end = timeOf(lastLeg?.arrival ?? lastLeg?.plannedArrival);
  if (start === null || end === null || end < start) return null;

  // Los tramos a pie no cuentan como transbordo: se cuentan los tramos con
  // vehículo y se resta el primero.
  const rideLegs = legs.filter((leg) => leg.walking !== true).length;

  return {
    mode: 'transit',
    durationMin: Math.round(((end - start) / 60_000) * 10) / 10,
    estimated: false,
    transfers: Math.max(0, rideLegs - 1),
  };
}

export interface TransitRestOptions {
  baseUrl: string;
}

export function createTransitRestProvider({ baseUrl }: TransitRestOptions): TransitProvider {
  return {
    async journey(from, to, departure, signal): Promise<TravelInfo | null> {
      const params = new URLSearchParams({
        'from.latitude': String(from.lat),
        'from.longitude': String(from.lng),
        'from.address': addressOf(from),
        'to.latitude': String(to.lat),
        'to.longitude': String(to.lng),
        'to.address': addressOf(to),
        departure: departure.toISOString(),
        results: '2',
        stopovers: 'false',
        polylines: 'false',
      });

      const data = await fetchJson<TransitResponse>(`${baseUrl}/journeys?${params.toString()}`, {
        ...(signal ? { signal } : {}),
        retries: 1,
        timeoutMs: 15_000,
      });

      // Se queda con la conexión más rápida de las devueltas.
      const options = (data.journeys ?? [])
        .map(mapJourney)
        .filter((info): info is TravelInfo => info !== null)
        .sort((a, b) => a.durationMin - b.durationMin);

      return options[0] ?? null;
    },
  };
}

/** La API exige un `address` junto a las coordenadas; sirve el par formateado. */
const addressOf = (point: LatLng): string => `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
