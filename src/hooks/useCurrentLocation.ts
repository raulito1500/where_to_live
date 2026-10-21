import { useCallback, useRef, useState } from 'react';
import type { LatLng } from '@/types';

/**
 * Geolocalización del navegador (sección 8.8). La UI nunca toca `navigator`:
 * este hook traduce la API a un estado con los tres errores del caso de uso.
 */
export type CurrentLocationStatus = 'idle' | 'requesting' | 'success' | 'error';

export type CurrentLocationErrorKind = 'permission' | 'unavailable' | 'timeout' | 'unsupported';

export interface CurrentLocationError {
  kind: CurrentLocationErrorKind;
  message: string;
  /** Qué puede hacer el usuario para arreglarlo. */
  hint: string;
}

export interface UseCurrentLocationResult {
  position: LatLng | null;
  accuracyM: number | null;
  status: CurrentLocationStatus;
  error: CurrentLocationError | null;
  request: () => void;
  reset: () => void;
}

const ERRORS: Record<CurrentLocationErrorKind, CurrentLocationError> = {
  permission: {
    kind: 'permission',
    message: 'No diste permiso de ubicación.',
    hint: 'Actívalo en el candado de la barra de direcciones y vuelve a intentar.',
  },
  unavailable: {
    kind: 'unavailable',
    message: 'El dispositivo no pudo determinar dónde estás.',
    hint: 'Comprueba que el GPS esté encendido y prueba de nuevo al aire libre.',
  },
  timeout: {
    kind: 'timeout',
    message: 'La ubicación tardó demasiado.',
    hint: 'Vuelve a intentar; al aire libre suele tardar menos.',
  },
  unsupported: {
    kind: 'unsupported',
    message: 'Este navegador no ofrece geolocalización.',
    hint: 'Recuerda que sólo funciona en HTTPS o en localhost.',
  },
};

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

export function useCurrentLocation(): UseCurrentLocationResult {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [status, setStatus] = useState<CurrentLocationStatus>('idle');
  const [error, setError] = useState<CurrentLocationError | null>(null);
  const requestIdRef = useRef(0);

  const request = useCallback(() => {
    const geolocation = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geolocation) {
      setStatus('error');
      setError(ERRORS.unsupported);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStatus('requesting');
    setError(null);

    geolocation.getCurrentPosition(
      (result) => {
        // Una respuesta tardía de una petición anterior no debe pisar la actual.
        if (requestIdRef.current !== requestId) return;
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
        setAccuracyM(result.coords.accuracy);
        setStatus('success');
      },
      (geolocationError) => {
        if (requestIdRef.current !== requestId) return;
        const kind: CurrentLocationErrorKind =
          geolocationError.code === geolocationError.PERMISSION_DENIED
            ? 'permission'
            : geolocationError.code === geolocationError.TIMEOUT
              ? 'timeout'
              : 'unavailable';
        setStatus('error');
        setError(ERRORS[kind]);
      },
      GEOLOCATION_OPTIONS,
    );
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setPosition(null);
    setAccuracyM(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { position, accuracyM, status, error, request, reset };
}
