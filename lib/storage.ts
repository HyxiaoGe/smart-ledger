type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const safeStorage: StorageLike | null =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? window.localStorage
    : null;

export function readJSON<T>(
  key: string,
  fallback: T,
  storage: StorageLike | null = safeStorage
): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T, storage: StorageLike | null = safeStorage) {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/security errors
  }
}

export function readString(key: string, fallback = '', storage: StorageLike | null = safeStorage) {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key: string, value: string, storage: StorageLike | null = safeStorage) {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // ignore quota/security errors
  }
}

export function removeItem(key: string, storage: StorageLike | null = safeStorage) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}
