/**
 * 应用错误基类
 *
 * 提供统一的错误结构，便于错误处理和响应生成
 */

import { ErrorCode, ErrorCodeToHttpStatus, ErrorCodeToMessage } from './ErrorCode';

export interface ErrorDetails {
  field?: string;
  message: string;
  value?: any;
}

export interface ErrorMetadata {
  traceId?: string;
  timestamp?: string;
  path?: string;
  method?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * 应用错误基类
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails[];
  public metadata?: ErrorMetadata;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: ErrorDetails[],
    metadata?: ErrorMetadata,
    isOperational: boolean = true
  ) {
    super(message || ErrorCodeToMessage[code]);

    this.code = code;
    this.statusCode = ErrorCodeToHttpStatus[code];
    this.details = details;
    this.metadata = {
      ...metadata,
      timestamp: metadata?.timestamp || new Date().toISOString(),
    };
    this.isOperational = isOperational;

    // 保持正确的堆栈跟踪（仅在 Node.js 环境）
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }

    // 设置原型链
    if (typeof Object.setPrototypeOf === 'function') {
      Object.setPrototypeOf(this, AppError.prototype);
    }
  }

  /**
   * 转换为 JSON 响应对象
   */
  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
      ...(this.metadata?.traceId && { traceId: this.metadata.traceId }),
    };
  }

  /**
   * 转换为详细的 JSON 对象（包含堆栈信息，用于开发环境）
   */
  toDetailedJSON() {
    return {
      ...this.toJSON(),
      stack: this.stack,
      metadata: this.metadata,
    };
  }
}

// ==================== 便捷的错误工厂函数 ====================

/**
 * 创建验证错误
 */
export class ValidationError extends AppError {
  constructor(message?: string, details?: ErrorDetails[], metadata?: ErrorMetadata) {
    super(ErrorCode.VALIDATION_ERROR, message, details, metadata);
  }
}

/**
 * 创建资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number, metadata?: ErrorMetadata) {
    const message = identifier
      ? `${resource} (${identifier}) 不存在`
      : `${resource} 不存在`;

    super(ErrorCode.NOT_FOUND, message, undefined, metadata);
  }
}

/**
 * 创建数据库错误
 */
export class DatabaseError extends AppError {
  constructor(message?: string, details?: ErrorDetails[], metadata?: ErrorMetadata) {
    super(ErrorCode.DATABASE_ERROR, message, details, metadata, false);
  }
}

/**
 * 创建 AI 服务错误
 */
export class AIServiceError extends AppError {
  constructor(
    code: ErrorCode = ErrorCode.AI_SERVICE_ERROR,
    message?: string,
    details?: ErrorDetails[],
    metadata?: ErrorMetadata
  ) {
    super(code, message, details, metadata);
  }
}

/**
 * 创建未授权错误
 */
export class UnauthorizedError extends AppError {
  constructor(message?: string, metadata?: ErrorMetadata) {
    super(ErrorCode.UNAUTHORIZED, message, undefined, metadata);
  }
}

/**
 * 创建数据不足错误
 */
export class InsufficientDataError extends AppError {
  constructor(message?: string, details?: ErrorDetails[], metadata?: ErrorMetadata) {
    super(ErrorCode.INSUFFICIENT_DATA, message, details, metadata);
  }
}

/**
 * 创建业务规则违反错误
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, details?: ErrorDetails[], metadata?: ErrorMetadata) {
    super(ErrorCode.BUSINESS_RULE_VIOLATION, message, details, metadata);
  }
}

/**
 * 创建内部错误
 */
export class InternalError extends AppError {
  constructor(message?: string, metadata?: ErrorMetadata) {
    super(ErrorCode.INTERNAL_ERROR, message, undefined, metadata, false);
  }
}

/**
 * 判断是否为 AppError 实例
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * 判断是否为操作性错误（可预期的错误）
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
