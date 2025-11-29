/**
 * helpers 工具函数测试
 * @module lib/utils/helpers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, generateSessionId, generateId } from '@/lib/utils/helpers';

describe('helpers utilities', () => {
  describe('cn (class name merger)', () => {
    it('should merge multiple class names', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn('base', isActive && 'active', isDisabled && 'disabled');
      expect(result).toBe('base active');
    });

    it('should handle array of classes', () => {
      const result = cn(['foo', 'bar']);
      expect(result).toBe('foo bar');
    });

    it('should handle object syntax', () => {
      const result = cn({
        foo: true,
        bar: false,
        baz: true,
      });
      expect(result).toBe('foo baz');
    });

    it('should merge Tailwind classes properly', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });

    it('should handle mixed inputs', () => {
      const result = cn('base', ['array-class'], { 'object-class': true });
      expect(result).toBe('base array-class object-class');
    });

    it('should handle undefined and null', () => {
      const result = cn('base', undefined, null, 'end');
      expect(result).toBe('base end');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle falsy values', () => {
      const result = cn('base', false, 0, '', 'end');
      expect(result).toBe('base end');
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "session_"', () => {
      const id = generateSessionId();
      expect(id.startsWith('session_')).toBe(true);
    });

    it('should contain timestamp', () => {
      const before = Date.now();
      const id = generateSessionId();
      const after = Date.now();

      // Extract timestamp from id
      const parts = id.split('_');
      const timestamp = parseInt(parts[1], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should have correct format', () => {
      const id = generateSessionId();
      // Format: session_{timestamp}_{random}
      expect(id).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should have correct format', () => {
      const id = generateId();
      // Format: {timestamp}_{random}
      expect(id).toMatch(/^\d+_[a-z0-9]+$/);
    });

    it('should contain timestamp', () => {
      const before = Date.now();
      const id = generateId();
      const after = Date.now();

      // Extract timestamp from id
      const timestamp = parseInt(id.split('_')[0], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate different random parts for same timestamp', () => {
      // Mock Date.now to return the same value
      const fixedTime = 1234567890;
      vi.spyOn(Date, 'now').mockReturnValue(fixedTime);

      // Generate multiple IDs
      const ids = new Set<string>();
      for (let i = 0; i < 10; i++) {
        ids.add(generateId());
      }

      // Most should be unique due to random part
      // (There's a very small chance of collision)
      expect(ids.size).toBeGreaterThan(1);

      vi.restoreAllMocks();
    });
  });
});
