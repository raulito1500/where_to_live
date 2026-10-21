import { createJSONStorage, type PersistStorage } from 'zustand/middleware';

/**
 * localStorage tolerante a fallos: en Safari privado o con cuota llena lanza
 * excepciones. La app debe seguir funcionando en memoria en ese caso.
 */
const memoryFallback = new Map<string, string>();

const safeLocalStorage: Storage | undefined = (() => {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const probe = '__wtl_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return undefined;
  }
})();

export const isPersistenceAvailable = safeLocalStorage !== undefined;

const storageDriver = {
  getItem: (key: string): string | null =>
    safeLocalStorage ? safeLocalStorage.getItem(key) : (memoryFallback.get(key) ?? null),
  setItem: (key: string, value: string): void => {
    if (safeLocalStorage) {
      try {
        safeLocalStorage.setItem(key, value);
        return;
      } catch {
        // Cuota llena: se degrada a memoria sin romper la UI.
      }
    }
    memoryFallback.set(key, value);
  },
  removeItem: (key: string): void => {
    safeLocalStorage?.removeItem(key);
    memoryFallback.delete(key);
  },
};

export function createPersistStorage<T>(): PersistStorage<T> | undefined {
  return createJSONStorage<T>(() => storageDriver);
}

/** Lectura cruda (para la caché de Overpass y el export/import de Ajustes). */
export function readRaw(key: string): string | null {
  return storageDriver.getItem(key);
}

export function writeRaw(key: string, value: string): void {
  storageDriver.setItem(key, value);
}

export function removeRaw(key: string): void {
  storageDriver.removeItem(key);
}
