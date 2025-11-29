/**
 * AppError 及错误工厂类测试
 * @module lib/domain/errors/AppError
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  AIServiceError,
  UnauthorizedError,
  InsufficientDataError,
  BusinessRuleError,
  InternalError,
  isAppError,
  isOperationalError,
} from '@/lib/domain/errors/AppError';
import { ErrorCode } from '@/lib/domain/errors/ErrorCode';

describe('AppError', () => {
  describe('constructor', () => {
    it('should set code, message, and statusCode', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test message');

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
    });

    it('should use default message when not provided', () => {
      const error = new AppError(ErrorCode.NOT_FOUND);

      expect(error.message).toBeDefined();
      expect(error.message.length).toBeGreaterThan(0);
    });

    it('should set metadata with timestamp', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR);

      expect(error.metadata).toBeDefined();
      expect(error.metadata?.timestamp).toBeDefined();
    });

    it('should default isOperational to true', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR);

      expect(error.isOperational).toBe(true);
    });

    it('should allow setting isOperational to false', () => {
      const error = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Internal error',
        undefined,
        undefined,
        false
      );

      expect(error.isOperational).toBe(false);
    });

    it('should store details array', () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'age', message: 'Must be positive' },
      ];
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed', details);

      expect(error.details).toEqual(details);
    });

    it('should store custom metadata', () => {
      const metadata = { traceId: '123', path: '/api/test' };
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test', undefined, metadata);

      expect(error.metadata?.traceId).toBe('123');
      expect(error.metadata?.path).toBe('/api/test');
    });

    it('should be an instance of Error', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('toJSON', () => {
    it('should return structured error response', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test message');
      const json = error.toJSON();

      expect(json.error).toBe(ErrorCode.VALIDATION_ERROR);
      expect(json.message).toBe('Test message');
      expect(json.statusCode).toBe(400);
    });

    it('should include traceId when available', () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Test',
        undefined,
        { traceId: 'trace-123' }
      );
      const json = error.toJSON();

      expect(json.traceId).toBe('trace-123');
    });

    it('should include details when available', () => {
      const details = [{ field: 'email', message: 'Invalid' }];
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test', details);
      const json = error.toJSON();

      expect(json.details).toEqual(details);
    });

    it('should not include details when not provided', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test');
      const json = error.toJSON();

      expect(json.details).toBeUndefined();
    });
  });

  describe('toDetailedJSON', () => {
    it('should include stack trace', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test');
      const json = error.toDetailedJSON();

      expect(json.stack).toBeDefined();
    });

    it('should include full metadata', () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Test',
        undefined,
        { path: '/test', method: 'POST' }
      );
      const json = error.toDetailedJSON();

      expect(json.metadata?.path).toBe('/test');
      expect(json.metadata?.method).toBe('POST');
    });
  });
});

describe('ValidationError', () => {
  it('should create validation error with correct code', () => {
    const error = new ValidationError('Invalid input');

    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input');
  });

  it('should accept details array', () => {
    const details = [{ field: 'name', message: 'Required' }];
    const error = new ValidationError('Validation failed', details);

    expect(error.details).toEqual(details);
  });

  it('should be operational', () => {
    const error = new ValidationError();
    expect(error.isOperational).toBe(true);
  });
});

describe('NotFoundError', () => {
  it('should create not found error with resource info', () => {
    const error = new NotFoundError('Transaction', '123');

    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain('Transaction');
    expect(error.message).toContain('123');
  });

  it('should handle resource without identifier', () => {
    const error = new NotFoundError('User');

    expect(error.message).toContain('User');
  });

  it('should be operational', () => {
    const error = new NotFoundError('Resource');
    expect(error.isOperational).toBe(true);
  });
});

describe('DatabaseError', () => {
  it('should create database error', () => {
    const error = new DatabaseError('Connection failed');

    expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Connection failed');
  });

  it('should mark as non-operational', () => {
    const error = new DatabaseError();

    expect(error.isOperational).toBe(false);
  });
});

describe('AIServiceError', () => {
  it('should use AI_SERVICE_ERROR code by default', () => {
    const error = new AIServiceError();

    expect(error.code).toBe(ErrorCode.AI_SERVICE_ERROR);
  });

  it('should allow custom AI error codes', () => {
    const error = new AIServiceError(ErrorCode.AI_RATE_LIMIT_EXCEEDED, 'Rate limited');

    expect(error.code).toBe(ErrorCode.AI_RATE_LIMIT_EXCEEDED);
  });

  it('should be operational', () => {
    const error = new AIServiceError();
    expect(error.isOperational).toBe(true);
  });
});

describe('UnauthorizedError', () => {
  it('should create unauthorized error', () => {
    const error = new UnauthorizedError('Token expired');

    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(error.statusCode).toBe(401);
  });

  it('should be operational', () => {
    const error = new UnauthorizedError();
    expect(error.isOperational).toBe(true);
  });
});

describe('InsufficientDataError', () => {
  it('should create insufficient data error', () => {
    const error = new InsufficientDataError('Not enough history');

    expect(error.code).toBe(ErrorCode.INSUFFICIENT_DATA);
    expect(error.message).toBe('Not enough history');
  });

  it('should be operational', () => {
    const error = new InsufficientDataError();
    expect(error.isOperational).toBe(true);
  });
});

describe('BusinessRuleError', () => {
  it('should create business rule error', () => {
    const error = new BusinessRuleError('Cannot delete active budget');

    expect(error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
    expect(error.message).toBe('Cannot delete active budget');
  });

  it('should be operational', () => {
    const error = new BusinessRuleError('Rule violated');
    expect(error.isOperational).toBe(true);
  });
});

describe('InternalError', () => {
  it('should create internal error', () => {
    const error = new InternalError('Unexpected error');

    expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(error.statusCode).toBe(500);
  });

  it('should mark as non-operational', () => {
    const error = new InternalError();
    expect(error.isOperational).toBe(false);
  });
});

describe('isAppError', () => {
  it('should return true for AppError instances', () => {
    const error = new AppError(ErrorCode.VALIDATION_ERROR);
    expect(isAppError(error)).toBe(true);
  });

  it('should return true for AppError subclasses', () => {
    expect(isAppError(new ValidationError())).toBe(true);
    expect(isAppError(new NotFoundError('test'))).toBe(true);
    expect(isAppError(new DatabaseError())).toBe(true);
  });

  it('should return false for regular errors', () => {
    expect(isAppError(new Error('test'))).toBe(false);
  });

  it('should return false for non-error objects', () => {
    expect(isAppError({ code: 'error' })).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError('error')).toBe(false);
  });
});

describe('isOperationalError', () => {
  it('should return true for operational AppErrors', () => {
    expect(isOperationalError(new ValidationError())).toBe(true);
    expect(isOperationalError(new NotFoundError('test'))).toBe(true);
    expect(isOperationalError(new UnauthorizedError())).toBe(true);
  });

  it('should return false for non-operational errors', () => {
    expect(isOperationalError(new DatabaseError())).toBe(false);
    expect(isOperationalError(new InternalError())).toBe(false);
  });

  it('should return false for regular errors', () => {
    expect(isOperationalError(new Error('test'))).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isOperationalError(null)).toBe(false);
    expect(isOperationalError(undefined)).toBe(false);
  });
});
