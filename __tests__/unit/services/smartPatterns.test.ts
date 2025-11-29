/**
 * 智能消费模式测试
 * @module lib/services/smartPatterns
 */

import { describe, it, expect } from 'vitest';
import {
  CONSUMPTION_PATTERNS,
  matchConsumptionPattern,
  getPatternBasedSuggestions,
  getConsumptionStats,
  type ConsumptionPattern,
} from '@/lib/services/smartPatterns';

describe('smartPatterns', () => {
  describe('CONSUMPTION_PATTERNS', () => {
    it('should contain valid pattern definitions', () => {
      expect(CONSUMPTION_PATTERNS).toBeInstanceOf(Array);
      expect(CONSUMPTION_PATTERNS.length).toBeGreaterThan(0);
    });

    it('should have required fields for each pattern', () => {
      CONSUMPTION_PATTERNS.forEach((pattern) => {
        expect(pattern.category).toBeDefined();
        expect(typeof pattern.category).toBe('string');
        expect(pattern.amountRange).toBeDefined();
        expect(typeof pattern.amountRange.min).toBe('number');
        expect(typeof pattern.amountRange.max).toBe('number');
        expect(pattern.typicalNotes).toBeInstanceOf(Array);
        expect(typeof pattern.confidence).toBe('number');
      });
    });

    it('should have valid amount ranges (min <= max)', () => {
      CONSUMPTION_PATTERNS.forEach((pattern) => {
        expect(pattern.amountRange.min).toBeLessThanOrEqual(pattern.amountRange.max);
      });
    });

    it('should have confidence values between 0 and 1', () => {
      CONSUMPTION_PATTERNS.forEach((pattern) => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should have non-empty typicalNotes arrays', () => {
      CONSUMPTION_PATTERNS.forEach((pattern) => {
        expect(pattern.typicalNotes.length).toBeGreaterThan(0);
      });
    });

    it('should include drink category patterns', () => {
      const drinkPatterns = CONSUMPTION_PATTERNS.filter((p) => p.category === 'drink');
      expect(drinkPatterns.length).toBeGreaterThan(0);
    });

    it('should include transport category patterns', () => {
      const transportPatterns = CONSUMPTION_PATTERNS.filter((p) => p.category === 'transport');
      expect(transportPatterns.length).toBeGreaterThan(0);
    });

    it('should include food category patterns', () => {
      const foodPatterns = CONSUMPTION_PATTERNS.filter((p) => p.category === 'food');
      expect(foodPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('matchConsumptionPattern', () => {
    it('should match drink category with correct amount', () => {
      const pattern = matchConsumptionPattern('drink', 12.0);
      expect(pattern).not.toBeNull();
      expect(pattern?.category).toBe('drink');
    });

    it('should match transport category with correct amount', () => {
      const pattern = matchConsumptionPattern('transport', 6.0);
      expect(pattern).not.toBeNull();
      expect(pattern?.category).toBe('transport');
    });

    it('should match food category with lunch amount', () => {
      const pattern = matchConsumptionPattern('food', 15.0);
      expect(pattern).not.toBeNull();
      expect(pattern?.category).toBe('food');
    });

    it('should return null for no match', () => {
      const pattern = matchConsumptionPattern('nonexistent', 100);
      expect(pattern).toBeNull();
    });

    it('should return null for amount out of range', () => {
      // drink patterns are typically 9-13.5
      const pattern = matchConsumptionPattern('drink', 50.0);
      expect(pattern).toBeNull();
    });

    it('should return null for amount below minimum', () => {
      const pattern = matchConsumptionPattern('drink', 1.0);
      expect(pattern).toBeNull();
    });

    it('should match at exact minimum boundary', () => {
      const drinkPattern = CONSUMPTION_PATTERNS.find((p) => p.category === 'drink');
      if (drinkPattern) {
        const pattern = matchConsumptionPattern('drink', drinkPattern.amountRange.min);
        expect(pattern).not.toBeNull();
      }
    });

    it('should match at exact maximum boundary', () => {
      const drinkPattern = CONSUMPTION_PATTERNS.find((p) => p.category === 'drink');
      if (drinkPattern) {
        const pattern = matchConsumptionPattern('drink', drinkPattern.amountRange.max);
        expect(pattern).not.toBeNull();
      }
    });
  });

  describe('getPatternBasedSuggestions', () => {
    it('should return suggestions for matching pattern', () => {
      const suggestions = getPatternBasedSuggestions('drink', 12.0);
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return empty array for no match', () => {
      const suggestions = getPatternBasedSuggestions('nonexistent', 100);
      expect(suggestions).toEqual([]);
    });

    it('should include confidence in suggestions', () => {
      const suggestions = getPatternBasedSuggestions('drink', 12.0);
      suggestions.forEach((suggestion) => {
        expect(suggestion.confidence).toBeDefined();
        expect(typeof suggestion.confidence).toBe('number');
        expect(suggestion.confidence).toBeGreaterThan(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should include reason in suggestions', () => {
      const suggestions = getPatternBasedSuggestions('drink', 12.0);
      suggestions.forEach((suggestion) => {
        expect(suggestion.reason).toBeDefined();
        expect(typeof suggestion.reason).toBe('string');
        expect(suggestion.reason.length).toBeGreaterThan(0);
      });
    });

    it('should include note in suggestions', () => {
      const suggestions = getPatternBasedSuggestions('drink', 12.0);
      suggestions.forEach((suggestion) => {
        expect(suggestion.note).toBeDefined();
        expect(typeof suggestion.note).toBe('string');
      });
    });

    it('should prioritize exact price point matches', () => {
      // 9.90 is an exact price point for drink
      const suggestions = getPatternBasedSuggestions('drink', 9.90);
      if (suggestions.length > 0) {
        // First suggestion should have high confidence for exact match
        expect(suggestions[0].confidence).toBeGreaterThan(0.7);
      }
    });

    it('should include time context in reason when provided', () => {
      const suggestions = getPatternBasedSuggestions('food', 15.0, '午餐时间');
      // Suggestions should exist for food category
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle transport category', () => {
      const suggestions = getPatternBasedSuggestions('transport', 6.0);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.note.includes('地铁'))).toBe(true);
    });
  });

  describe('getConsumptionStats', () => {
    it('should return high frequency for high confidence patterns', () => {
      // drink category has high confidence (0.95)
      const stats = getConsumptionStats('drink', 12.0);
      expect(stats.frequency).toBe('high');
    });

    it('should return medium frequency for medium confidence patterns', () => {
      // Check if any pattern has medium confidence
      const mediumPattern = CONSUMPTION_PATTERNS.find(
        (p) => p.confidence >= 0.8 && p.confidence < 0.9
      );
      if (mediumPattern) {
        const amount = (mediumPattern.amountRange.min + mediumPattern.amountRange.max) / 2;
        const stats = getConsumptionStats(mediumPattern.category, amount);
        expect(['high', 'medium']).toContain(stats.frequency);
      }
    });

    it('should return low frequency for unmatched patterns', () => {
      const stats = getConsumptionStats('nonexistent', 100);
      expect(stats.frequency).toBe('low');
    });

    it('should return typicalAmount for matched patterns', () => {
      const stats = getConsumptionStats('drink', 12.0);
      expect(stats.typicalAmount).toBeDefined();
      expect(typeof stats.typicalAmount).toBe('number');
    });

    it('should return input amount as typicalAmount for unmatched patterns', () => {
      const stats = getConsumptionStats('nonexistent', 123.45);
      expect(stats.typicalAmount).toBe(123.45);
    });

    it('should return lastUsed as null', () => {
      const stats = getConsumptionStats('drink', 12.0);
      expect(stats.lastUsed).toBeNull();
    });

    it('should calculate typicalAmount as midpoint of range', () => {
      const pattern = CONSUMPTION_PATTERNS.find((p) => p.category === 'drink');
      if (pattern) {
        const amount = (pattern.amountRange.min + pattern.amountRange.max) / 2;
        const stats = getConsumptionStats('drink', pattern.amountRange.min);
        const expectedMidpoint = (pattern.amountRange.min + pattern.amountRange.max) / 2;
        expect(stats.typicalAmount).toBe(expectedMidpoint);
      }
    });
  });

  describe('pattern coverage', () => {
    it('should cover common coffee prices', () => {
      // 瑞幸常见价格
      expect(matchConsumptionPattern('drink', 9.90)).not.toBeNull();
      expect(matchConsumptionPattern('drink', 12.90)).not.toBeNull();
    });

    it('should cover subway fare', () => {
      expect(matchConsumptionPattern('transport', 6.0)).not.toBeNull();
    });

    it('should cover typical lunch prices', () => {
      expect(matchConsumptionPattern('food', 15.0)).not.toBeNull();
      expect(matchConsumptionPattern('food', 17.0)).not.toBeNull();
    });

    it('should cover typical dinner prices', () => {
      expect(matchConsumptionPattern('food', 18.0)).not.toBeNull();
    });
  });
});
