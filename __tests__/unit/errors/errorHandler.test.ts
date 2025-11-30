/**
 * errorHandler 错误处理工具测试
 * @module lib/domain/errors/errorHandler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZodError } from 'zod';
import {
  generateTraceId,
  zodErrorToValidationError,
  normalizeError,
  safeAsync,
  safeSync,
} from '@/lib/domain/errors/errorHandler';
import {
  AppError,
  ValidationError,
  InternalError,
  DatabaseError,
  isAppError,
} from '@/lib/domain/errors/AppError';
import { ErrorCode } from '@/lib/domain/errors/ErrorCode';

describe('errorHandler utilities', () => {
  describe('generateTraceId', () => {
    it('should generate unique trace IDs', () => {
      const id1 = generateTraceId();
      const id2 = generateTraceId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "trace_"', () => {
      const id = generateTraceId();
      expect(id.startsWith('trace_')).toBe(true);
    });

    it('should have correct format', () => {
      const id = generateTraceId();
      // Format: trace_{timestamp}_{random}
      expect(id).toMatch(/^trace_\d+_[a-z0-9]+$/);
    });

    it('should contain timestamp', () => {
      const before = Date.now();
      const id = generateTraceId();
      const after = Date.now();

      const parts = id.split('_');
      const timestamp = parseInt(parts[1], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('zodErrorToValidationError', () => {
    it('should convert ZodError to ValidationError', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          path: ['email'],
          message: 'Expected string, received number',
        } as any,
      ]);

      const result = zodErrorToValidationError(zodError);

      // Check by properties instead of instanceof (works better across module boundaries)
      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.details).toBeDefined();
      expect(result.details?.length).toBe(1);
      expect(result.details?.[0].field).toBe('email');
    });

    it('should include traceId when provided', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          path: ['field'],
          message: 'Invalid',
        } as any,
      ]);

      const result = zodErrorToValidationError(zodError, 'trace-123');

      expect(result.metadata?.traceId).toBe('trace-123');
    });

    it('should handle nested paths', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          path: ['user', 'profile', 'email'],
          message: 'Invalid email',
        } as any,
      ]);

      const result = zodErrorToValidationError(zodError);

      expect(result.details?.[0].field).toBe('user.profile.email');
    });

    it('should handle multiple errors', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          path: ['email'],
          message: 'Invalid email',
        } as any,
        {
          code: 'too_small',
          minimum: 1,
          inclusive: true,
          path: ['name'],
          message: 'Name is required',
        } as any,
      ]);

      const result = zodErrorToValidationError(zodError);

      expect(result.details?.length).toBe(2);
    });

    it('should handle ZodError without errors array', () => {
      // Create a mock ZodError with undefined errors
      const zodError = new ZodError([]);
      (zodError as any).errors = undefined;
      (zodError as any).message = 'Invalid data';

      const result = zodErrorToValidationError(zodError);

      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('normalizeError', () => {
    it('should return AppError as-is', () => {
      const appError = new AppError(ErrorCode.VALIDATION_ERROR, 'Test error');

      const result = normalizeError(appError);

      expect(result).toBe(appError);
    });

    it('should add traceId to AppError if missing', () => {
      const appError = new AppError(ErrorCode.VALIDATION_ERROR, 'Test error');

      const result = normalizeError(appError, 'trace-123');

      expect(result.metadata?.traceId).toBe('trace-123');
    });

    it('should preserve existing traceId on AppError', () => {
      const appError = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Test error',
        undefined,
        { traceId: 'existing-trace' }
      );

      const result = normalizeError(appError, 'new-trace');

      expect(result.metadata?.traceId).toBe('existing-trace');
    });

    it('should convert ZodError to ValidationError', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          path: ['field'],
          message: 'Invalid',
        } as any,
      ]);

      const result = normalizeError(zodError);

      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should convert Error to InternalError', () => {
      const error = new Error('Something went wrong');

      const result = normalizeError(error, 'trace-123');

      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.message).toBe('Something went wrong');
      expect(result.metadata?.traceId).toBe('trace-123');
    });

    it('should handle string errors', () => {
      const result = normalizeError('string error');

      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.metadata?.originalError).toBe('string error');
    });

    it('should handle null/undefined', () => {
      const result1 = normalizeError(null);
      const result2 = normalizeError(undefined);

      expect(isAppError(result1)).toBe(true);
      expect(isAppError(result2)).toBe(true);
      expect(result1.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result2.code).toBe(ErrorCode.INTERNAL_ERROR);
    });

    it('should handle object errors', () => {
      const result = normalizeError({ code: 'ERROR', message: 'Something' });

      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
    });

    it('should preserve ValidationError subclass', () => {
      const validationError = new ValidationError('Invalid input', [
        { field: 'email', message: 'Invalid email' },
      ]);

      const result = normalizeError(validationError);

      expect(result).toBe(validationError);
      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should preserve DatabaseError subclass', () => {
      const dbError = new DatabaseError('Connection failed');

      const result = normalizeError(dbError);

      expect(result).toBe(dbError);
      expect(isAppError(result)).toBe(true);
      expect(result.code).toBe(ErrorCode.DATABASE_ERROR);
    });
  });

  describe('safeAsync', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return result on success', async () => {
      const fn = async () => 'success';

      const result = await safeAsync(fn);

      expect(result).toBe('success');
    });

    it('should return null on error', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };

      const result = await safeAsync(fn);

      expect(result).toBeNull();
    });

    it('should log error with custom message', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const fn = async () => {
        throw new Error('Test error');
      };

      await safeAsync(fn, 'Custom error message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Custom error message'),
        expect.any(Error)
      );
    });

    it('should call onError callback', async () => {
      const onError = vi.fn();
      const error = new Error('Test error');
      const fn = async () => {
        throw error;
      };

      await safeAsync(fn, undefined, onError);

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should handle onError callback errors gracefully', async () => {
      const onError = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const fn = async () => {
        throw new Error('Test error');
      };

      // Should not throw
      const result = await safeAsync(fn, undefined, onError);

      expect(result).toBeNull();
    });

    it('should use default error message', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const fn = async () => {
        throw new Error('Test error');
      };

      await safeAsync(fn);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('异步操作失败'),
        expect.any(Error)
      );
    });
  });

  describe('safeSync', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return result on success', () => {
      const fn = () => 'success';

      const result = safeSync(fn, 'fallback');

      expect(result).toBe('success');
    });

    it('should return fallback on error', () => {
      const fn = () => {
        throw new Error('Test error');
      };

      const result = safeSync(fn, 'fallback');

      expect(result).toBe('fallback');
    });

    it('should log error with custom message', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const fn = () => {
        throw new Error('Test error');
      };

      safeSync(fn, null, 'Custom error message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Custom error message'),
        expect.any(Error)
      );
    });

    it('should use default error message', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const fn = () => {
        throw new Error('Test error');
      };

      safeSync(fn, null);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('同步操作失败'),
        expect.any(Error)
      );
    });

    it('should work with JSON.parse', () => {
      const result = safeSync(() => JSON.parse('invalid json'), null, '解析失败');

      expect(result).toBeNull();
    });

    it('should work with valid JSON.parse', () => {
      const result = safeSync(() => JSON.parse('{"foo": "bar"}'), null);

      expect(result).toEqual({ foo: 'bar' });
    });
  });
});
