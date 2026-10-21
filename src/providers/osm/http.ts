/**
 * Utilidades HTTP compartidas por los adaptadores OSM.
 * Los servicios son gratuitos y con límites estrictos (sección 12), así que
 * todo pasa por aquí: timeouts, reintentos con backoff y errores tipados.
 */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message?: string,
  ) {
    super(message ?? `La petición falló con estado ${status}`);
    this.name = 'HttpError';
  }
}

export class TimeoutError extends Error {
  constructor(public readonly url: string) {
    super('La petición tardó demasiado');
    this.name = 'TimeoutError';
  }
}

export interface FetchJsonOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Reintentos ante 429/5xx, con espera creciente. */
  retries?: number;
  method?: 'GET' | 'POST';
  /** Un string se envía tal cual (Overpass); cualquier otra cosa va como JSON. */
  body?: unknown;
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 12_000;

/** 429 y 5xx son transitorios: merecen reintento. El resto, no. */
const isRetryable = (status: number): boolean => status === 429 || status >= 500;

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const {
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = 2,
    method = 'GET',
    body,
    headers = {},
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const isRawBody = typeof body === 'string';
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined && !isRawBody ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: isRawBody ? body : JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        const error = new HttpError(response.status, url);
        if (isRetryable(response.status) && attempt < retries) {
          lastError = error;
          await wait(2 ** attempt * 600, signal);
          continue;
        }
        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      // Un abort externo (el usuario siguió escribiendo) no se reintenta.
      if (signal?.aborted) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new TimeoutError(url);
      } else {
        lastError = error;
      }
      if (attempt >= retries) break;
      await wait(2 ** attempt * 600, signal);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('La petición falló');
}
