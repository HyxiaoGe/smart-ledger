/**
 * MemoryCache 测试
 * @module lib/infrastructure/cache/MemoryCache
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryCache } from '@/lib/infrastructure/cache/MemoryCache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should store and retrieve object values', () => {
      const obj = { name: 'test', count: 42 };
      cache.set('obj', obj);
      expect(cache.get('obj')).toEqual(obj);
    });

    it('should store and retrieve array values', () => {
      const arr = [1, 2, 3, 4, 5];
      cache.set('arr', arr);
      expect(cache.get('arr')).toEqual(arr);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing values', () => {
      cache.set('key', 'value1');
      cache.set('key', 'value2');
      expect(cache.get('key')).toBe('value2');
    });

    it('should store null values when allowNull is true', () => {
      cache.set('nullKey', null, { allowNull: true });
      expect(cache.get('nullKey')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should return value within TTL', () => {
      cache.set('key', 'value', { ttl: 5000 });
      vi.advanceTimersByTime(4000);
      expect(cache.get('key')).toBe('value');
    });

    it('should return null for expired entries', () => {
      cache.set('key', 'value', { ttl: 5000 });
      vi.advanceTimersByTime(6000);
      expect(cache.get('key')).toBeNull();
    });

    it('should not expire entries without TTL', () => {
      cache.set('key', 'value');
      vi.advanceTimersByTime(100000);
      expect(cache.get('key')).toBe('value');
    });

    it('should expire at exact TTL boundary', () => {
      cache.set('key', 'value', { ttl: 5000 });
      vi.advanceTimersByTime(5001);
      expect(cache.get('key')).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', () => {
      cache.set('key', 'value', { ttl: 1000 });
      vi.advanceTimersByTime(2000);
      expect(cache.has('key')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove entry from cache', () => {
      cache.set('key', 'value');
      cache.delete('key');
      expect(cache.get('key')).toBeNull();
    });

    it('should not throw for non-existent keys', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });

    it('should update tag index when deleting', () => {
      cache.set('key', 'value', { tags: ['tag1'] });
      cache.delete('key');
      // Verify tag index is updated by checking invalidateByTag doesn't affect other entries
      cache.set('key2', 'value2', { tags: ['tag1'] });
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should reset stats', () => {
      cache.set('key', 'value');
      cache.get('key'); // hit
      cache.get('missing'); // miss
      cache.clear();
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should clear tag index', () => {
      cache.set('key', 'value', { tags: ['tag1'] });
      cache.clear();
      cache.set('key2', 'value2', { tags: ['tag1'] });
      cache.invalidateByTag('tag1');
      // Should only invalidate new entry, not throw error
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('tags', () => {
    it('should associate entries with tags', () => {
      cache.set('key1', 'value1', { tags: ['tag1', 'tag2'] });
      cache.set('key2', 'value2', { tags: ['tag1'] });
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });

    it('should invalidate entries by tag', () => {
      cache.set('key1', 'value1', { tags: ['tag1'] });
      cache.set('key2', 'value2', { tags: ['tag1'] });
      cache.set('key3', 'value3', { tags: ['tag2'] });

      cache.invalidateByTag('tag1');

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
    });

    it('should handle multiple tags per entry', () => {
      cache.set('key', 'value', { tags: ['tag1', 'tag2'] });
      cache.invalidateByTag('tag1');
      expect(cache.get('key')).toBeNull();
    });

    it('should handle non-existent tag', () => {
      cache.set('key', 'value', { tags: ['tag1'] });
      cache.invalidateByTag('nonexistent');
      expect(cache.get('key')).toBe('value');
    });
  });

  describe('invalidateByPrefix', () => {
    it('should remove entries matching prefix', () => {
      cache.set('user:1', 'value1');
      cache.set('user:2', 'value2');
      cache.set('post:1', 'value3');

      cache.invalidateByPrefix('user:');

      expect(cache.get('user:1')).toBeNull();
      expect(cache.get('user:2')).toBeNull();
      expect(cache.get('post:1')).toBe('value3');
    });

    it('should handle no matching prefix', () => {
      cache.set('key1', 'value1');
      cache.invalidateByPrefix('nonexistent:');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should match exact prefix', () => {
      cache.set('users', 'value1');
      cache.set('user:1', 'value2');
      cache.invalidateByPrefix('user:');
      expect(cache.get('users')).toBe('value1');
      expect(cache.get('user:1')).toBeNull();
    });
  });

  describe('keys', () => {
    it('should return all cache keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should return empty array for empty cache', () => {
      expect(cache.keys()).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should track hits correctly', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('key');
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it('should track misses correctly', () => {
      cache.get('missing1');
      cache.get('missing2');
      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('key', 'value');
      cache.get('key'); // hit
      cache.get('key'); // hit
      cache.get('missing'); // miss
      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(2 / 3, 5);
    });

    it('should return 0 hit rate for empty cache', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should track size correctly', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      cache.set('key1', 'value1', { ttl: 1000 });
      cache.set('key2', 'value2', { ttl: 5000 });
      cache.set('key3', 'value3');

      vi.advanceTimersByTime(2000);
      cache.cleanup();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    it('should not affect non-expired entries', () => {
      cache.set('key', 'value', { ttl: 10000 });
      vi.advanceTimersByTime(5000);
      cache.cleanup();
      expect(cache.get('key')).toBe('value');
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(cache.size).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
      cache.delete('key1');
      expect(cache.size).toBe(1);
    });
  });
});
