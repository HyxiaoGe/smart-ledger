/**
 * storage 工具函数测试
 * @module lib/utils/storage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readJSON,
  writeJSON,
  readString,
  writeString,
  removeItem,
  hasStorageQuota,
  cleanupExpiredData,
} from '@/lib/utils/storage';

// Mock storage implementation
function createMockStorage(): Storage {
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

describe('storage utilities', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe('readJSON', () => {
    it('should return parsed JSON', () => {
      const data = { foo: 'bar', num: 42 };
      mockStorage.setItem('test', JSON.stringify(data));

      const result = readJSON('test', {}, mockStorage);
      expect(result).toEqual(data);
    });

    it('should return fallback when key not found', () => {
      const fallback = { default: true };
      const result = readJSON('nonexistent', fallback, mockStorage);
      expect(result).toBe(fallback);
    });

    it('should return fallback on parse error', () => {
      mockStorage.setItem('invalid', 'not valid json');
      const fallback = { default: true };

      const result = readJSON('invalid', fallback, mockStorage);
      expect(result).toBe(fallback);
    });

    it('should return fallback when storage is null', () => {
      const fallback = { default: true };
      const result = readJSON('test', fallback, null);
      expect(result).toBe(fallback);
    });

    it('should handle empty string value', () => {
      mockStorage.setItem('empty', '');
      const fallback = { default: true };

      const result = readJSON('empty', fallback, mockStorage);
      expect(result).toBe(fallback);
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      mockStorage.setItem('array', JSON.stringify(data));

      const result = readJSON<number[]>('array', [], mockStorage);
      expect(result).toEqual(data);
    });

    it('should handle null values', () => {
      mockStorage.setItem('null', 'null');

      const result = readJSON('null', 'fallback', mockStorage);
      expect(result).toBeNull();
    });
  });

  describe('writeJSON', () => {
    it('should write JSON string to storage', () => {
      const data = { foo: 'bar' };
      writeJSON('test', data, mockStorage);

      expect(mockStorage.setItem).toHaveBeenCalledWith('test', JSON.stringify(data));
    });

    it('should do nothing when storage is null', () => {
      const data = { foo: 'bar' };
      writeJSON('test', data, null);
      // No error should be thrown
    });

    it('should handle circular references gracefully', () => {
      const mockStorageWithError = createMockStorage();
      mockStorageWithError.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw
      writeJSON('test', { foo: 'bar' }, mockStorageWithError);
    });

    it('should write arrays', () => {
      const data = [1, 2, 3];
      writeJSON('array', data, mockStorage);

      expect(mockStorage.setItem).toHaveBeenCalledWith('array', '[1,2,3]');
    });

    it('should write null', () => {
      writeJSON('null', null, mockStorage);
      expect(mockStorage.setItem).toHaveBeenCalledWith('null', 'null');
    });
  });

  describe('readString', () => {
    it('should return stored string', () => {
      mockStorage.setItem('test', 'hello');

      const result = readString('test', 'default', mockStorage);
      expect(result).toBe('hello');
    });

    it('should return fallback when key not found', () => {
      const result = readString('nonexistent', 'default', mockStorage);
      expect(result).toBe('default');
    });

    it('should return fallback when storage is null', () => {
      const result = readString('test', 'default', null);
      expect(result).toBe('default');
    });

    it('should use empty string as default fallback', () => {
      const result = readString('nonexistent', undefined, mockStorage);
      expect(result).toBe('');
    });

    it('should return empty string if stored', () => {
      mockStorage.setItem('empty', '');

      // Note: getItem returns null for empty key in our mock,
      // but real localStorage returns '' for empty value
      const realMockStorage = {
        ...mockStorage,
        getItem: vi.fn(() => ''),
      } as unknown as Storage;

      const result = readString('empty', 'default', realMockStorage);
      expect(result).toBe('');
    });
  });

  describe('writeString', () => {
    it('should write string to storage', () => {
      writeString('test', 'hello', mockStorage);

      expect(mockStorage.setItem).toHaveBeenCalledWith('test', 'hello');
    });

    it('should do nothing when storage is null', () => {
      writeString('test', 'hello', null);
      // No error should be thrown
    });

    it('should handle storage errors gracefully', () => {
      const mockStorageWithError = createMockStorage();
      mockStorageWithError.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      // Should not throw
      writeString('test', 'hello', mockStorageWithError);
    });
  });

  describe('removeItem', () => {
    it('should remove item from storage', () => {
      mockStorage.setItem('test', 'value');
      removeItem('test', mockStorage);

      expect(mockStorage.removeItem).toHaveBeenCalledWith('test');
    });

    it('should do nothing when storage is null', () => {
      removeItem('test', null);
      // No error should be thrown
    });

    it('should handle storage errors gracefully', () => {
      const mockStorageWithError = createMockStorage();
      mockStorageWithError.removeItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw
      removeItem('test', mockStorageWithError);
    });
  });

  describe('hasStorageQuota', () => {
    it('should return true when storage works', () => {
      const result = hasStorageQuota(mockStorage);
      expect(result).toBe(true);
    });

    it('should return false when storage is null', () => {
      const result = hasStorageQuota(null);
      expect(result).toBe(false);
    });

    it('should return false on quota exceeded error', () => {
      const mockStorageWithError = createMockStorage();
      mockStorageWithError.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const result = hasStorageQuota(mockStorageWithError);
      expect(result).toBe(false);
    });

    it('should clean up test key after check', () => {
      hasStorageQuota(mockStorage);

      expect(mockStorage.removeItem).toHaveBeenCalledWith('__storage_quota_test__');
    });
  });

  describe('cleanupExpiredData', () => {
    it('should remove expired items with prefix', () => {
      const now = Date.now();
      const maxAge = 1000; // 1 second

      // Add expired item
      mockStorage.setItem(
        'prefix_old',
        JSON.stringify({ timestamp: now - 2000, data: 'old' })
      );
      // Add fresh item
      mockStorage.setItem(
        'prefix_new',
        JSON.stringify({ timestamp: now, data: 'new' })
      );
      // Add item without prefix
      mockStorage.setItem(
        'other_key',
        JSON.stringify({ timestamp: now - 2000, data: 'other' })
      );

      const cleaned = cleanupExpiredData('prefix_', maxAge, mockStorage);

      expect(cleaned).toBe(1);
      expect(mockStorage.removeItem).toHaveBeenCalledWith('prefix_old');
    });

    it('should return 0 when storage is null', () => {
      const result = cleanupExpiredData('prefix_', 1000, null);
      expect(result).toBe(0);
    });

    it('should remove items with invalid JSON', () => {
      const now = Date.now();
      const maxAge = 1000;

      mockStorage.setItem('prefix_invalid', 'not valid json');

      const cleaned = cleanupExpiredData('prefix_', maxAge, mockStorage);

      expect(cleaned).toBe(1);
      expect(mockStorage.removeItem).toHaveBeenCalledWith('prefix_invalid');
    });

    it('should not remove items without timestamp', () => {
      const maxAge = 1000;

      mockStorage.setItem('prefix_notime', JSON.stringify({ data: 'value' }));

      const cleaned = cleanupExpiredData('prefix_', maxAge, mockStorage);

      // Item without timestamp is not removed (no timestamp check triggers removal)
      expect(cleaned).toBe(0);
    });
  });
});
