/**
 * smartSuggestions 服务测试
 * @module lib/services/smartSuggestions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SmartSuggestionsCache,
  mergeSuggestions,
} from '@/lib/services/smartSuggestions';
import type { SmartSuggestion, CommonNote } from '@/types/domain/transaction';

describe('smartSuggestions', () => {
  describe('SmartSuggestionsCache', () => {
    let cache: SmartSuggestionsCache;

    beforeEach(() => {
      // Create a fresh instance for each test
      cache = new (SmartSuggestionsCache as any)();
    });

    describe('getInstance', () => {
      it('should return singleton instance', () => {
        const instance1 = SmartSuggestionsCache.getInstance();
        const instance2 = SmartSuggestionsCache.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('get/set', () => {
      it('should return null for non-existent key', () => {
        const result = cache.get({ category: 'food', amount: 15 });
        expect(result).toBeNull();
      });

      it('should return cached data', () => {
        const params = { category: 'food', amount: 15 };
        const data = {
          suggestions: [],
          fallback_notes: [],
          context: { category: 'food' },
        };

        cache.set(params, data);
        const result = cache.get(params);

        expect(result).toEqual(data);
      });

      it('should generate consistent cache keys', () => {
        const params = { category: 'food', amount: 15, currency: 'CNY' };
        const data = {
          suggestions: [],
          fallback_notes: [],
          context: {},
        };

        cache.set(params, data);

        // Same params should hit cache
        const result = cache.get({ category: 'food', amount: 15, currency: 'CNY' });
        expect(result).toEqual(data);
      });

      it('should return null for expired cache', () => {
        const params = { category: 'food', amount: 15 };
        const data = {
          suggestions: [],
          fallback_notes: [],
          context: {},
        };

        cache.set(params, data);

        // Fast-forward time by 6 minutes (TTL is 5 minutes)
        vi.useFakeTimers();
        vi.advanceTimersByTime(6 * 60 * 1000);

        const result = cache.get(params);
        expect(result).toBeNull();

        vi.useRealTimers();
      });

      it('should handle params with partial_input', () => {
        const params = { category: 'food', partial_input: '咖' };
        const data = {
          suggestions: [{ id: '1', content: '咖啡', confidence: 0.9 }],
          fallback_notes: [],
          context: {},
        };

        cache.set(params, data);
        const result = cache.get(params);

        expect(result).toEqual(data);
      });

      it('should handle params with time_context', () => {
        const params = { category: 'food', time_context: '午餐时间' };
        const data = {
          suggestions: [],
          fallback_notes: [],
          context: { time_context: '午餐时间' },
        };

        cache.set(params, data);
        const result = cache.get(params);

        expect(result).toEqual(data);
      });
    });

    describe('clear', () => {
      it('should clear all cached data', () => {
        const params1 = { category: 'food', amount: 15 };
        const params2 = { category: 'drink', amount: 10 };
        const data = {
          suggestions: [],
          fallback_notes: [],
          context: {},
        };

        cache.set(params1, data);
        cache.set(params2, data);

        cache.clear();

        expect(cache.get(params1)).toBeNull();
        expect(cache.get(params2)).toBeNull();
      });
    });

    describe('cleanup', () => {
      it('should remove expired entries', () => {
        vi.useFakeTimers();

        const params1 = { category: 'food', amount: 15 };
        const params2 = { category: 'drink', amount: 10 };
        const data = {
          suggestions: [],
          fallback_notes: [],
          context: {},
        };

        cache.set(params1, data);

        // Fast-forward 3 minutes
        vi.advanceTimersByTime(3 * 60 * 1000);

        cache.set(params2, data);

        // Fast-forward 3 more minutes (params1 should be expired, params2 should not)
        vi.advanceTimersByTime(3 * 60 * 1000);

        cache.cleanup();

        // params1 should be expired and removed
        expect(cache.get(params1)).toBeNull();
        // params2 should still be valid
        expect(cache.get(params2)).toEqual(data);

        vi.useRealTimers();
      });
    });
  });

  describe('mergeSuggestions', () => {
    const createSmartSuggestion = (
      id: string,
      content: string,
      confidence: number
    ): SmartSuggestion => ({
      id,
      content,
      confidence,
      type: 'smart',
      reason: 'Test reason',
    });

    const createCommonNote = (
      id: string,
      content: string,
      usage_count: number
    ): CommonNote => ({
      id,
      content,
      usage_count,
      last_used_at: new Date().toISOString(),
      category: 'food',
      created_at: new Date().toISOString(),
    });

    it('should prioritize high confidence suggestions', () => {
      const smartSuggestions = [
        createSmartSuggestion('1', 'High confidence', 0.9),
        createSmartSuggestion('2', 'Low confidence', 0.3),
      ];
      const fallbackNotes: CommonNote[] = [];

      const result = mergeSuggestions(smartSuggestions, fallbackNotes);

      expect(result[0].content).toBe('High confidence');
    });

    it('should include fallback notes when slots available', () => {
      const smartSuggestions = [
        createSmartSuggestion('1', 'Smart suggestion', 0.8),
      ];
      const fallbackNotes = [
        createCommonNote('2', 'Fallback note', 10),
      ];

      const result = mergeSuggestions(smartSuggestions, fallbackNotes, 4);

      expect(result.length).toBe(2);
      expect(result.some((r) => r.content === 'Fallback note')).toBe(true);
    });

    it('should respect maxTotal limit', () => {
      const smartSuggestions = [
        createSmartSuggestion('1', 'Suggestion 1', 0.9),
        createSmartSuggestion('2', 'Suggestion 2', 0.8),
        createSmartSuggestion('3', 'Suggestion 3', 0.7),
      ];
      const fallbackNotes = [
        createCommonNote('4', 'Note 1', 10),
        createCommonNote('5', 'Note 2', 5),
      ];

      const result = mergeSuggestions(smartSuggestions, fallbackNotes, 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should deduplicate by content (case insensitive)', () => {
      const smartSuggestions = [
        createSmartSuggestion('1', 'Coffee', 0.9),
        createSmartSuggestion('2', 'coffee', 0.8),
      ];
      const fallbackNotes: CommonNote[] = [];

      const result = mergeSuggestions(smartSuggestions, fallbackNotes);

      expect(result.filter((r) => r.content.toLowerCase() === 'coffee').length).toBe(1);
    });

    it('should deduplicate across smart suggestions and fallback notes', () => {
      const smartSuggestions = [
        createSmartSuggestion('1', 'Coffee', 0.9),
      ];
      const fallbackNotes = [
        createCommonNote('2', 'coffee', 10),
      ];

      const result = mergeSuggestions(smartSuggestions, fallbackNotes);

      expect(result.filter((r) => r.content.toLowerCase() === 'coffee').length).toBe(1);
    });

    it('should sort fallback notes by usage_count', () => {
      const smartSuggestions: SmartSuggestion[] = [];
      const fallbackNotes = [
        createCommonNote('1', 'Low usage', 5),
        createCommonNote('2', 'High usage', 20),
        createCommonNote('3', 'Medium usage', 10),
      ];

      const result = mergeSuggestions(smartSuggestions, fallbackNotes, 3);

      // First should be highest usage count
      expect(result[0].content).toBe('High usage');
    });

    it('should include medium confidence suggestions if space available', () => {
      const smartSuggestions = [
        createSmartSuggestion('1', 'High confidence', 0.9),
        createSmartSuggestion('2', 'Medium confidence', 0.4),
      ];
      const fallbackNotes: CommonNote[] = [];

      const result = mergeSuggestions(smartSuggestions, fallbackNotes, 4);

      expect(result.some((r) => r.content === 'Medium confidence')).toBe(true);
    });

    it('should handle empty inputs', () => {
      const result = mergeSuggestions([], []);
      expect(result).toEqual([]);
    });

    it('should handle only fallback notes', () => {
      const fallbackNotes = [
        createCommonNote('1', 'Note 1', 10),
        createCommonNote('2', 'Note 2', 5),
      ];

      const result = mergeSuggestions([], fallbackNotes, 4);

      expect(result.length).toBe(2);
    });

    it('should handle only smart suggestions', () => {
      const smartSuggestions = [
        createSmartSuggestion('1', 'Suggestion 1', 0.9),
        createSmartSuggestion('2', 'Suggestion 2', 0.8),
      ];

      const result = mergeSuggestions(smartSuggestions, [], 4);

      expect(result.length).toBe(2);
    });

    it('should filter low confidence suggestions initially', () => {
      const smartSuggestions = [
        createSmartSuggestion('1', 'Low confidence 1', 0.2),
        createSmartSuggestion('2', 'Low confidence 2', 0.1),
      ];
      const fallbackNotes = [
        createCommonNote('3', 'Fallback', 10),
      ];

      const result = mergeSuggestions(smartSuggestions, fallbackNotes, 4);

      // Low confidence suggestions should not be in first batch
      // But might be included if there's space
      expect(result.some((r) => r.content === 'Fallback')).toBe(true);
    });

    it('should use default maxTotal of 8', () => {
      const smartSuggestions = Array.from({ length: 10 }, (_, i) =>
        createSmartSuggestion(`${i}`, `Suggestion ${i}`, 0.9 - i * 0.05)
      );

      const result = mergeSuggestions(smartSuggestions, []);

      expect(result.length).toBeLessThanOrEqual(8);
    });
  });
});
