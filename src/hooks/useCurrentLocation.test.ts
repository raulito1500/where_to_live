import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCurrentLocation } from './useCurrentLocation';

type SuccessCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

const position = (lat: number, lng: number, accuracy: number) =>
  ({ coords: { latitude: lat, longitude: lng, accuracy } }) as GeolocationPosition;

/** Códigos de la API: 1 permiso, 2 no disponible, 3 timeout. */
const geolocationError = (code: 1 | 2 | 3) =>
  ({
    code,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
    message: '',
  }) as GeolocationPositionError;

function mockGeolocation(
  implementation: (
    onSuccess: SuccessCallback,
    onError: ErrorCallback,
    options?: PositionOptions,
  ) => void,
) {
  const getCurrentPosition = vi.fn(implementation);
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  return getCurrentPosition;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCurrentLocation', () => {
  it('empieza en reposo', () => {
    mockGeolocation(() => {});
    const { result } = renderHook(() => useCurrentLocation());
    expect(result.current.status).toBe('idle');
    expect(result.current.position).toBeNull();
  });

  it('devuelve posición y precisión al conceder el permiso', async () => {
    mockGeolocation((onSuccess) => onSuccess(position(52.3906, 13.0645, 12)));
    const { result } = renderHook(() => useCurrentLocation());

    act(() => result.current.request());

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.position).toEqual({ lat: 52.3906, lng: 13.0645 });
    expect(result.current.accuracyM).toBe(12);
    expect(result.current.error).toBeNull();
  });

  it('pide alta precisión y timeout de 10 s (sección 8.8)', () => {
    const getCurrentPosition = mockGeolocation(() => {});
    const { result } = renderHook(() => useCurrentLocation());

    act(() => result.current.request());

    const options = getCurrentPosition.mock.calls[0]?.[2];
    expect(options?.enableHighAccuracy).toBe(true);
    expect(options?.timeout).toBe(10_000);
  });

  it.each([
    [1, 'permission', 'permiso'],
    [2, 'unavailable', 'dónde estás'],
    [3, 'timeout', 'demasiado'],
  ] as const)('traduce el error %i a "%s"', async (code, kind, fragment) => {
    mockGeolocation((_onSuccess, onError) => onError(geolocationError(code)));
    const { result } = renderHook(() => useCurrentLocation());

    act(() => result.current.request());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.kind).toBe(kind);
    expect(result.current.error?.message.toLowerCase()).toContain(fragment);
    expect(result.current.error?.hint).not.toBe('');
  });

  it('avisa si el navegador no ofrece geolocalización', async () => {
    vi.stubGlobal('navigator', {});
    const { result } = renderHook(() => useCurrentLocation());

    act(() => result.current.request());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.kind).toBe('unsupported');
    expect(result.current.error?.hint).toContain('HTTPS');
  });

  it('ignora la respuesta tardía de una petición anterior', async () => {
    const pending: SuccessCallback[] = [];
    mockGeolocation((onSuccess) => pending.push(onSuccess));
    const { result } = renderHook(() => useCurrentLocation());

    act(() => result.current.request());
    act(() => result.current.request());

    // Responde primero la petición vieja: no debe pisar a la nueva.
    act(() => pending[0]!(position(0, 0, 999)));
    expect(result.current.position).toBeNull();

    act(() => pending[1]!(position(52.39, 13.06, 8)));
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.position).toEqual({ lat: 52.39, lng: 13.06 });
  });

  it('reset vuelve al estado inicial', async () => {
    mockGeolocation((onSuccess) => onSuccess(position(52.39, 13.06, 8)));
    const { result } = renderHook(() => useCurrentLocation());

    act(() => result.current.request());
    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.position).toBeNull();
    expect(result.current.accuracyM).toBeNull();
  });
});
