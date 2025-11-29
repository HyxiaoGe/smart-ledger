/**
 * 格式化工具函数测试
 * @module lib/utils/format
 */

import { describe, it, expect } from 'vitest';
import { currencySymbol, formatAmount, formatCurrency } from '@/lib/utils/format';

describe('format utilities', () => {
  describe('currencySymbol', () => {
    it('should return ¥ for CNY', () => {
      expect(currencySymbol('CNY')).toBe('¥');
    });

    it('should return $ for USD', () => {
      expect(currencySymbol('USD')).toBe('$');
    });

    it('should return empty string for unknown currency', () => {
      expect(currencySymbol('EUR')).toBe('');
      expect(currencySymbol('GBP')).toBe('');
      expect(currencySymbol('')).toBe('');
    });

    it('should be case sensitive', () => {
      expect(currencySymbol('cny')).toBe('');
      expect(currencySymbol('usd')).toBe('');
    });
  });

  describe('formatAmount', () => {
    it('should format integer without decimal places', () => {
      expect(formatAmount(100)).toBe('100');
      expect(formatAmount(1000)).toBe('1,000');
    });

    it('should format decimal numbers', () => {
      expect(formatAmount(100.5)).toBe('100.5');
      expect(formatAmount(100.55)).toBe('100.55');
    });

    it('should limit decimal places to 2', () => {
      // Note: toLocaleString may round, behavior depends on locale
      const result = formatAmount(100.556);
      expect(result).toMatch(/100\.5[56]/);
    });

    it('should handle zero', () => {
      expect(formatAmount(0)).toBe('0');
    });

    it('should handle NaN', () => {
      expect(formatAmount(NaN)).toBe('0');
    });

    it('should format large numbers with thousand separators', () => {
      expect(formatAmount(1234567)).toBe('1,234,567');
      expect(formatAmount(1234567.89)).toBe('1,234,567.89');
    });

    it('should handle negative numbers', () => {
      const result = formatAmount(-100);
      expect(result).toContain('100');
    });

    it('should handle very small numbers', () => {
      expect(formatAmount(0.01)).toBe('0.01');
      expect(formatAmount(0.1)).toBe('0.1');
    });
  });

  describe('formatCurrency', () => {
    it('should combine symbol and formatted amount for CNY', () => {
      expect(formatCurrency(100, 'CNY')).toBe('¥100');
      expect(formatCurrency(1000.5, 'CNY')).toBe('¥1,000.5');
    });

    it('should combine symbol and formatted amount for USD', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100');
      expect(formatCurrency(1000.5, 'USD')).toBe('$1,000.5');
    });

    it('should handle unknown currency (no symbol)', () => {
      expect(formatCurrency(100, 'EUR')).toBe('100');
    });

    it('should handle zero amount', () => {
      expect(formatCurrency(0, 'CNY')).toBe('¥0');
    });

    it('should handle decimal amounts', () => {
      expect(formatCurrency(99.99, 'CNY')).toBe('¥99.99');
    });
  });
});
