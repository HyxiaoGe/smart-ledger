/**
 * ErrorCode 枚举及映射测试
 * @module lib/domain/errors/ErrorCode
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  ErrorCodeToHttpStatus,
  ErrorCodeToMessage,
} from '@/lib/domain/errors/ErrorCode';

describe('ErrorCode', () => {
  describe('ErrorCode enum', () => {
    it('should have validation error codes', () => {
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCode.INVALID_REQUEST).toBe('INVALID_REQUEST');
      expect(ErrorCode.INVALID_DATE_FORMAT).toBe('INVALID_DATE_FORMAT');
      expect(ErrorCode.INVALID_AMOUNT).toBe('INVALID_AMOUNT');
      expect(ErrorCode.INVALID_CATEGORY).toBe('INVALID_CATEGORY');
      expect(ErrorCode.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should have resource error codes', () => {
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCode.TRANSACTION_NOT_FOUND).toBe('TRANSACTION_NOT_FOUND');
      expect(ErrorCode.BUDGET_NOT_FOUND).toBe('BUDGET_NOT_FOUND');
      expect(ErrorCode.NOTE_NOT_FOUND).toBe('NOTE_NOT_FOUND');
    });

    it('should have auth error codes', () => {
      expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCode.SESSION_EXPIRED).toBe('SESSION_EXPIRED');
    });

    it('should have business logic error codes', () => {
      expect(ErrorCode.INSUFFICIENT_DATA).toBe('INSUFFICIENT_DATA');
      expect(ErrorCode.DUPLICATE_ENTRY).toBe('DUPLICATE_ENTRY');
      expect(ErrorCode.CONFLICT).toBe('CONFLICT');
      expect(ErrorCode.BUSINESS_RULE_VIOLATION).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('should have database error codes', () => {
      expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorCode.DATABASE_CONNECTION_ERROR).toBe('DATABASE_CONNECTION_ERROR');
      expect(ErrorCode.DATABASE_QUERY_ERROR).toBe('DATABASE_QUERY_ERROR');
      expect(ErrorCode.DATABASE_CONSTRAINT_ERROR).toBe('DATABASE_CONSTRAINT_ERROR');
    });

    it('should have AI service error codes', () => {
      expect(ErrorCode.AI_SERVICE_ERROR).toBe('AI_SERVICE_ERROR');
      expect(ErrorCode.AI_SERVICE_UNAVAILABLE).toBe('AI_SERVICE_UNAVAILABLE');
      expect(ErrorCode.AI_RATE_LIMIT_EXCEEDED).toBe('AI_RATE_LIMIT_EXCEEDED');
      expect(ErrorCode.AI_TIMEOUT).toBe('AI_TIMEOUT');
      expect(ErrorCode.AI_INVALID_RESPONSE).toBe('AI_INVALID_RESPONSE');
    });

    it('should have external service error codes', () => {
      expect(ErrorCode.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
      expect(ErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
      expect(ErrorCode.GATEWAY_TIMEOUT).toBe('GATEWAY_TIMEOUT');
    });

    it('should have internal error codes', () => {
      expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
      expect(ErrorCode.CONFIGURATION_ERROR).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('ErrorCodeToHttpStatus', () => {
    it('should have mapping for all error codes', () => {
      const allErrorCodes = Object.values(ErrorCode);
      allErrorCodes.forEach((code) => {
        expect(ErrorCodeToHttpStatus[code]).toBeDefined();
        expect(typeof ErrorCodeToHttpStatus[code]).toBe('number');
      });
    });

    it('should map validation errors to 400', () => {
      expect(ErrorCodeToHttpStatus[ErrorCode.VALIDATION_ERROR]).toBe(400);
      expect(ErrorCodeToHttpStatus[ErrorCode.INVALID_REQUEST]).toBe(400);
      expect(ErrorCodeToHttpStatus[ErrorCode.INVALID_DATE_FORMAT]).toBe(400);
      expect(ErrorCodeToHttpStatus[ErrorCode.INVALID_AMOUNT]).toBe(400);
      expect(ErrorCodeToHttpStatus[ErrorCode.INVALID_CATEGORY]).toBe(400);
      expect(ErrorCodeToHttpStatus[ErrorCode.MISSING_REQUIRED_FIELD]).toBe(400);
    });

    it('should map resource errors to 404', () => {
      expect(ErrorCodeToHttpStatus[ErrorCode.NOT_FOUND]).toBe(404);
      expect(ErrorCodeToHttpStatus[ErrorCode.TRANSACTION_NOT_FOUND]).toBe(404);
      expect(ErrorCodeToHttpStatus[ErrorCode.BUDGET_NOT_FOUND]).toBe(404);
      expect(ErrorCodeToHttpStatus[ErrorCode.NOTE_NOT_FOUND]).toBe(404);
    });

    it('should map auth errors to 401/403', () => {
      expect(ErrorCodeToHttpStatus[ErrorCode.UNAUTHORIZED]).toBe(401);
      expect(ErrorCodeToHttpStatus[ErrorCode.FORBIDDEN]).toBe(403);
      expect(ErrorCodeToHttpStatus[ErrorCode.SESSION_EXPIRED]).toBe(401);
    });

    it('should map conflict errors to 409', () => {
      expect(ErrorCodeToHttpStatus[ErrorCode.DUPLICATE_ENTRY]).toBe(409);
      expect(ErrorCodeToHttpStatus[ErrorCode.CONFLICT]).toBe(409);
    });

    it('should map database errors to 500', () => {
      expect(ErrorCodeToHttpStatus[ErrorCode.DATABASE_ERROR]).toBe(500);
      expect(ErrorCodeToHttpStatus[ErrorCode.DATABASE_CONNECTION_ERROR]).toBe(500);
      expect(ErrorCodeToHttpStatus[ErrorCode.DATABASE_QUERY_ERROR]).toBe(500);
      expect(ErrorCodeToHttpStatus[ErrorCode.DATABASE_CONSTRAINT_ERROR]).toBe(500);
    });

    it('should map AI errors correctly', () => {
      expect(ErrorCodeToHttpStatus[ErrorCode.AI_SERVICE_ERROR]).toBe(503);
      expect(ErrorCodeToHttpStatus[ErrorCode.AI_SERVICE_UNAVAILABLE]).toBe(503);
      expect(ErrorCodeToHttpStatus[ErrorCode.AI_RATE_LIMIT_EXCEEDED]).toBe(429);
      expect(ErrorCodeToHttpStatus[ErrorCode.AI_TIMEOUT]).toBe(504);
      expect(ErrorCodeToHttpStatus[ErrorCode.AI_INVALID_RESPONSE]).toBe(502);
    });

    it('should map internal errors to 500', () => {
      expect(ErrorCodeToHttpStatus[ErrorCode.INTERNAL_ERROR]).toBe(500);
      expect(ErrorCodeToHttpStatus[ErrorCode.UNKNOWN_ERROR]).toBe(500);
      expect(ErrorCodeToHttpStatus[ErrorCode.CONFIGURATION_ERROR]).toBe(500);
    });
  });

  describe('ErrorCodeToMessage', () => {
    it('should have Chinese message for all error codes', () => {
      const allErrorCodes = Object.values(ErrorCode);
      allErrorCodes.forEach((code) => {
        expect(ErrorCodeToMessage[code]).toBeDefined();
        expect(typeof ErrorCodeToMessage[code]).toBe('string');
        expect(ErrorCodeToMessage[code].length).toBeGreaterThan(0);
      });
    });

    it('should have meaningful validation error messages', () => {
      expect(ErrorCodeToMessage[ErrorCode.VALIDATION_ERROR]).toContain('验证');
      expect(ErrorCodeToMessage[ErrorCode.INVALID_DATE_FORMAT]).toContain('日期');
      expect(ErrorCodeToMessage[ErrorCode.INVALID_AMOUNT]).toContain('金额');
      expect(ErrorCodeToMessage[ErrorCode.MISSING_REQUIRED_FIELD]).toContain('必填');
    });

    it('should have meaningful resource error messages', () => {
      expect(ErrorCodeToMessage[ErrorCode.NOT_FOUND]).toContain('不存在');
      expect(ErrorCodeToMessage[ErrorCode.TRANSACTION_NOT_FOUND]).toContain('交易');
      expect(ErrorCodeToMessage[ErrorCode.BUDGET_NOT_FOUND]).toContain('预算');
    });

    it('should have meaningful auth error messages', () => {
      expect(ErrorCodeToMessage[ErrorCode.UNAUTHORIZED]).toContain('授权');
      expect(ErrorCodeToMessage[ErrorCode.FORBIDDEN]).toContain('权限');
      expect(ErrorCodeToMessage[ErrorCode.SESSION_EXPIRED]).toContain('过期');
    });

    it('should have meaningful database error messages', () => {
      expect(ErrorCodeToMessage[ErrorCode.DATABASE_ERROR]).toContain('数据库');
      expect(ErrorCodeToMessage[ErrorCode.DATABASE_CONNECTION_ERROR]).toContain('连接');
    });

    it('should have meaningful AI error messages', () => {
      expect(ErrorCodeToMessage[ErrorCode.AI_SERVICE_ERROR]).toContain('AI');
      expect(ErrorCodeToMessage[ErrorCode.AI_RATE_LIMIT_EXCEEDED]).toContain('频繁');
      expect(ErrorCodeToMessage[ErrorCode.AI_TIMEOUT]).toContain('超时');
    });
  });

  describe('consistency checks', () => {
    it('should have same number of entries in all mappings', () => {
      const errorCodeCount = Object.values(ErrorCode).length;
      const httpStatusCount = Object.keys(ErrorCodeToHttpStatus).length;
      const messageCount = Object.keys(ErrorCodeToMessage).length;

      expect(httpStatusCount).toBe(errorCodeCount);
      expect(messageCount).toBe(errorCodeCount);
    });

    it('should have valid HTTP status codes', () => {
      Object.values(ErrorCodeToHttpStatus).forEach((status) => {
        expect(status).toBeGreaterThanOrEqual(100);
        expect(status).toBeLessThan(600);
      });
    });
  });
});
