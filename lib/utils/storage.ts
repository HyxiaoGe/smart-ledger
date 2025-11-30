type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'>;

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

/**
 * 检查是否有足够的存储空间
 * 通过尝试写入测试数据来检测 quota
 */
export function hasStorageQuota(storage: StorageLike | null = safeStorage): boolean {
  if (!storage) return false;

  const testKey = '__storage_quota_test__';
  const testValue = 'x'.repeat(1024); // 1KB test data

  try {
    storage.setItem(testKey, testValue);
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    // QuotaExceededError 或其他存储错误
    return false;
  }
}

/**
 * 获取 localStorage 使用情况（估算）
 */
export function getStorageUsage(storage: StorageLike | null = safeStorage): {
  used: number;
  available: number;
  percentage: number;
} | null {
  if (!storage || typeof window === 'undefined') return null;

  try {
    let used = 0;
    // 估算已使用空间
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        const value = storage.getItem(key);
        used += key.length + (value?.length || 0);
      }
    }

    // localStorage 通常限制为 5-10MB，这里保守估计 5MB
    const available = 5 * 1024 * 1024;
    const percentage = (used / available) * 100;

    return {
      used,
      available,
      percentage: Math.min(percentage, 100),
    };
  } catch {
    return null;
  }
}

/**
 * 清理过期的数据
 */
export function cleanupExpiredData(
  prefix: string,
  maxAge: number,
  storage: StorageLike | null = safeStorage
): number {
  if (!storage) return 0;

  let cleaned = 0;
  const now = Date.now();
  const keysToRemove: string[] = [];

  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith(prefix)) continue;

      try {
        const value = storage.getItem(key);
        if (!value) continue;

        const data = JSON.parse(value);
        if (data.timestamp && now - data.timestamp > maxAge) {
          keysToRemove.push(key);
        }
      } catch {
        // 如果解析失败，也清理掉
        keysToRemove.push(key);
      }
    }

    // 批量移除
    keysToRemove.forEach(key => {
      storage.removeItem(key);
      cleaned++;
    });

    return cleaned;
  } catch {
    return cleaned;
  }
}
