/**
 * Cola con intervalo mínimo entre peticiones. Nominatim exige máx. 1 req/s
 * (sección 12) y el navegador no reintenta por nosotros.
 */
export interface RateLimiter {
  <T>(task: () => Promise<T>): Promise<T>;
}

export function createRateLimiter(minIntervalMs: number): RateLimiter {
  let chain: Promise<unknown> = Promise.resolve();
  let lastStartedAt = 0;

  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = async (): Promise<T> => {
      const waitMs = Math.max(0, lastStartedAt + minIntervalMs - Date.now());
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      lastStartedAt = Date.now();
      return task();
    };
    // Cada tarea se encola detrás de la anterior, fallen o no.
    const result = chain.then(run, run);
    chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
