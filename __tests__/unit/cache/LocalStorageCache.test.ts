/**
 * LocalStorageCache 测试
 * @module lib/infrastructure/cache/LocalStorageCache
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalStorageCache } from '@/lib/infrastructure/cache/LocalStorageCache';

// Mock localStorage
function createMockLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

describe('LocalStorageCache', () => {
  let cache: LocalStorageCache;
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;

  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
    // Mock window.localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
    cache = new LocalStorageCache('test:');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('should return cached value', () => {
      const entry = {
        value: 'test-value',
        timestamp: Date.now(),
      };
      mockLocalStorage.setItem('test:key', JSON.stringify(entry));

      const result = cache.get('key');
      expect(result).toBe('test-value');
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for expired entry', () => {
      const entry = {
        value: 'test-value',
        timestamp: Date.now() - 10000,
        expiresAt: Date.now() - 5000, // Already expired
      };
      mockLocalStorage.setItem('test:key', JSON.stringify(entry));

      const result = cache.get('key');
      expect(result).toBeNull();
    });

    it('should delete expired entry on get', () => {
      const entry = {
        value: 'test-value',
        timestamp: Date.now() - 10000,
        expiresAt: Date.now() - 5000,
      };
      mockLocalStorage.setItem('test:key', JSON.stringify(entry));

      cache.get('key');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test:key');
    });

    it('should increment miss counter on miss', () => {
      cache.get('nonexistent');
      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
    });

    it('should increment hit counter on hit', () => {
      const entry = {
        value: 'test-value',
        timestamp: Date.now(),
      };
      mockLocalStorage.setItem('test:key', JSON.stringify(entry));

      cache.get('key');
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
    });

    it('should handle invalid JSON gracefully', () => {
      mockLocalStorage.setItem('test:invalid', 'not valid json');

      // Mock console.error to prevent output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = cache.get('invalid');
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('set', () => {
    it('should store value in localStorage', () => {
      cache.set('key', 'value');

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const call = mockLocalStorage.setItem.mock.calls[0];
      expect(call[0]).toBe('test:key');

      const storedEntry = JSON.parse(call[1]);
      expect(storedEntry.value).toBe('value');
    });

    it('should set TTL when provided', () => {
      const ttl = 5000;
      cache.set('key', 'value', { ttl });

      const call = mockLocalStorage.setItem.mock.calls[0];
      const storedEntry = JSON.parse(call[1]);

      expect(storedEntry.expiresAt).toBeDefined();
      expect(storedEntry.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should store tags when provided', () => {
      cache.set('key', 'value', { tags: ['tag1', 'tag2'] });

      const call = mockLocalStorage.setItem.mock.calls[0];
      const storedEntry = JSON.parse(call[1]);

      expect(storedEntry.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle storage errors gracefully', () => {
      mockLocalStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      cache.set('key', 'value');

      consoleSpy.mockRestore();
    });
  });

  describe('has', () => {
    it('should return true for existing valid entry', () => {
      const entry = {
        value: 'test-value',
        timestamp: Date.now(),
      };
      mockLocalStorage.setItem('test:key', JSON.stringify(entry));

      expect(cache.has('key')).toBe(true);
    });

    it('should return false for non-existent entry', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entry', () => {
      const entry = {
        value: 'test-value',
        timestamp: Date.now() - 10000,
        expiresAt: Date.now() - 5000,
      };
      mockLocalStorage.setItem('test:key', JSON.stringify(entry));

      expect(cache.has('key')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove entry from localStorage', () => {
      const entry = {
        value: 'test-value',
        timestamp: Date.now(),
      };
      mockLocalStorage.setItem('test:key', JSON.stringify(entry));

      cache.delete('key');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test:key');
    });
  });

  describe('clear', () => {
    it('should remove all entries with prefix', () => {
      const entry = {
        value: 'test-value',
        timestamp: Date.now(),
      };
      mockLocalStorage.setItem('test:key1', JSON.stringify(entry));
      mockLocalStorage.setItem('test:key2', JSON.stringify(entry));
      mockLocalStorage.setItem('other:key', JSON.stringify(entry));

      cache.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test:key1');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test:key2');
    });

    it('should reset stats', () => {
      // Generate some hits/misses
      cache.get('nonexistent');

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('invalidateByTag', () => {
    it('should remove entries with matching tag', () => {
      const entry1 = {
        value: 'value1',
        timestamp: Date.now(),
        tags: ['tag1'],
      };
      const entry2 = {
        value: 'value2',
        timestamp: Date.now(),
        tags: ['tag2'],
      };
      mockLocalStorage.setItem('test:key1', JSON.stringify(entry1));
      mockLocalStorage.setItem('test:key2', JSON.stringify(entry2));

      cache.invalidateByTag('tag1');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test:key1');
    });
  });

  describe('invalidateByPrefix', () => {
    it('should remove entries with matching key prefix', () => {
      const entry = {
        value: 'value',
        timestamp: Date.now(),
      };
      mockLocalStorage.setItem('test:user:1', JSON.stringify(entry));
      mockLocalStorage.setItem('test:user:2', JSON.stringify(entry));
      mockLocalStorage.setItem('test:other:1', JSON.stringify(entry));

      cache.invalidateByPrefix('user:');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test:user:1');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test:user:2');
    });
  });

  describe('keys', () => {
    it('should return all keys without prefix', () => {
      const entry = {
        value: 'value',
        timestamp: Date.now(),
      };
      mockLocalStorage.setItem('test:key1', JSON.stringify(entry));
      mockLocalStorage.setItem('test:key2', JSON.stringify(entry));
      mockLocalStorage.setItem('other:key3', JSON.stringify(entry));

      const keys = cache.keys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).not.toContain('key3');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const entry = {
        value: 'value',
        timestamp: Date.now(),
      };
      mockLocalStorage.setItem('test:key', JSON.stringify(entry));

      cache.get('key'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should return 0 hitRate when no requests', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      const expiredEntry = {
        value: 'expired',
        timestamp: Date.now() - 10000,
        expiresAt: Date.now() - 5000,
      };
      const validEntry = {
        value: 'valid',
        timestamp: Date.now(),
        expiresAt: Date.now() + 5000,
      };
      mockLocalStorage.setItem('test:expired', JSON.stringify(expiredEntry));
      mockLocalStorage.setItem('test:valid', JSON.stringify(validEntry));

      cache.cleanup();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test:expired');
    });
  });

  describe('prefix handling', () => {
    it('should use default prefix when not provided', () => {
      const defaultCache = new LocalStorageCache();
      defaultCache.set('key', 'value');

      const call = mockLocalStorage.setItem.mock.calls[0];
      expect(call[0]).toBe('cache:key');
    });

    it('should use custom prefix', () => {
      const customCache = new LocalStorageCache('custom:');
      customCache.set('key', 'value');

      const call = mockLocalStorage.setItem.mock.calls[0];
      expect(call[0]).toBe('custom:key');
    });
  });
});
