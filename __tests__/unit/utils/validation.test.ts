/**
 * 验证工具函数测试
 * @module lib/utils/validation
 */

import { describe, it, expect } from 'vitest';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import { z } from 'zod';

describe('validation utilities', () => {
  describe('validateRequest', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    });

    it('should return success for valid data', () => {
      const result = validateRequest(testSchema, { name: 'John', age: 25 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John');
        expect(result.data.age).toBe(25);
      }
    });

    it('should return formatted errors for invalid data', () => {
      const result = validateRequest(testSchema, { name: '', age: -5 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response).toBeDefined();
      }
    });

    it('should handle missing required fields', () => {
      const result = validateRequest(testSchema, { name: 'John' });
      expect(result.success).toBe(false);
    });

    it('should handle wrong types', () => {
      const result = validateRequest(testSchema, { name: 123, age: 'twenty' });
      expect(result.success).toBe(false);
    });

    it('should handle empty object', () => {
      const result = validateRequest(testSchema, {});
      expect(result.success).toBe(false);
    });

    it('should handle null input', () => {
      const result = validateRequest(testSchema, null);
      expect(result.success).toBe(false);
    });
  });

  describe('commonSchemas.uuid', () => {
    it('should validate correct UUID format', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const result = commonSchemas.uuid.safeParse(validUUID);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(commonSchemas.uuid.safeParse('not-a-uuid').success).toBe(false);
      expect(commonSchemas.uuid.safeParse('12345').success).toBe(false);
      expect(commonSchemas.uuid.safeParse('').success).toBe(false);
    });

    it('should reject UUID without dashes', () => {
      const result = commonSchemas.uuid.safeParse('550e8400e29b41d4a716446655440000');
      expect(result.success).toBe(false);
    });
  });

  describe('commonSchemas.date', () => {
    it('should validate YYYY-MM-DD format', () => {
      expect(commonSchemas.date.safeParse('2024-06-15').success).toBe(true);
      expect(commonSchemas.date.safeParse('2024-01-01').success).toBe(true);
      expect(commonSchemas.date.safeParse('2024-12-31').success).toBe(true);
    });

    it('should reject invalid date format', () => {
      expect(commonSchemas.date.safeParse('2024/06/15').success).toBe(false);
      expect(commonSchemas.date.safeParse('2024-6-15').success).toBe(false);
      expect(commonSchemas.date.safeParse('15-06-2024').success).toBe(false);
      expect(commonSchemas.date.safeParse('2024-06-15T00:00:00').success).toBe(false);
    });

    it('should reject empty string', () => {
      expect(commonSchemas.date.safeParse('').success).toBe(false);
    });
  });

  describe('commonSchemas.amount', () => {
    it('should validate positive numbers', () => {
      expect(commonSchemas.amount.safeParse(1).success).toBe(true);
      expect(commonSchemas.amount.safeParse(100.5).success).toBe(true);
      expect(commonSchemas.amount.safeParse(0.01).success).toBe(true);
    });

    it('should reject zero', () => {
      expect(commonSchemas.amount.safeParse(0).success).toBe(false);
    });

    it('should reject negative numbers', () => {
      expect(commonSchemas.amount.safeParse(-1).success).toBe(false);
      expect(commonSchemas.amount.safeParse(-100).success).toBe(false);
    });

    it('should reject non-numbers', () => {
      expect(commonSchemas.amount.safeParse('100').success).toBe(false);
      expect(commonSchemas.amount.safeParse(null).success).toBe(false);
    });
  });

  describe('commonSchemas.currency', () => {
    it('should accept CNY', () => {
      expect(commonSchemas.currency.safeParse('CNY').success).toBe(true);
    });

    it('should accept USD', () => {
      expect(commonSchemas.currency.safeParse('USD').success).toBe(true);
    });

    it('should reject other currencies', () => {
      expect(commonSchemas.currency.safeParse('EUR').success).toBe(false);
      expect(commonSchemas.currency.safeParse('GBP').success).toBe(false);
      expect(commonSchemas.currency.safeParse('JPY').success).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(commonSchemas.currency.safeParse('cny').success).toBe(false);
      expect(commonSchemas.currency.safeParse('usd').success).toBe(false);
    });
  });

  describe('commonSchemas.transactionType', () => {
    it('should accept income', () => {
      expect(commonSchemas.transactionType.safeParse('income').success).toBe(true);
    });

    it('should accept expense', () => {
      expect(commonSchemas.transactionType.safeParse('expense').success).toBe(true);
    });

    it('should reject other types', () => {
      expect(commonSchemas.transactionType.safeParse('transfer').success).toBe(false);
      expect(commonSchemas.transactionType.safeParse('saving').success).toBe(false);
      expect(commonSchemas.transactionType.safeParse('').success).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(commonSchemas.transactionType.safeParse('Income').success).toBe(false);
      expect(commonSchemas.transactionType.safeParse('EXPENSE').success).toBe(false);
    });
  });

  describe('commonSchemas.nonEmptyString', () => {
    it('should accept non-empty strings', () => {
      expect(commonSchemas.nonEmptyString.safeParse('hello').success).toBe(true);
      expect(commonSchemas.nonEmptyString.safeParse(' ').success).toBe(true);
      expect(commonSchemas.nonEmptyString.safeParse('a').success).toBe(true);
    });

    it('should reject empty string', () => {
      expect(commonSchemas.nonEmptyString.safeParse('').success).toBe(false);
    });
  });

  describe('commonSchemas.month', () => {
    it('should validate YYYY-MM format', () => {
      expect(commonSchemas.month.safeParse('2024-06').success).toBe(true);
      expect(commonSchemas.month.safeParse('2024-01').success).toBe(true);
      expect(commonSchemas.month.safeParse('2024-12').success).toBe(true);
    });

    it('should reject invalid month format', () => {
      expect(commonSchemas.month.safeParse('2024-6').success).toBe(false);
      expect(commonSchemas.month.safeParse('2024/06').success).toBe(false);
      expect(commonSchemas.month.safeParse('24-06').success).toBe(false);
      expect(commonSchemas.month.safeParse('2024-06-01').success).toBe(false);
    });

    it('should reject empty string', () => {
      expect(commonSchemas.month.safeParse('').success).toBe(false);
    });
  });
});
