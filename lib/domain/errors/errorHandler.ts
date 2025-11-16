/**
 * 统一错误处理工具
 *
 * 提供错误处理中间件和响应格式化功能
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, ValidationError, InternalError, isAppError } from './AppError';
import { ErrorCode } from './ErrorCode';
import type { ErrorDetails } from './AppError';

/**
 * 生成唯一的追踪 ID
 */
export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 将 Zod 错误转换为 ValidationError
 */
export function zodErrorToValidationError(error: ZodError, traceId?: string): ValidationError {
  const details: ErrorDetails[] = error.errors.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
    value: err.code === 'invalid_type' ? undefined : err,
  }));

  return new ValidationError(
    '请求数据验证失败',
    details,
    { traceId }
  );
}

/**
 * 将未知错误转换为 AppError
 */
export function normalizeError(error: unknown, traceId?: string): AppError {
  // 如果已经是 AppError，直接返回
  if (isAppError(error)) {
    if (!error.metadata?.traceId) {
      error.metadata = {
        ...error.metadata,
        traceId,
      };
    }
    return error;
  }

  // Zod 验证错误
  if (error instanceof ZodError) {
    return zodErrorToValidationError(error, traceId);
  }

  // 标准 Error 对象
  if (error instanceof Error) {
    return new InternalError(
      error.message,
      {
        traceId,
        originalError: error.name,
        stack: error.stack,
      }
    );
  }

  // 其他类型错误
  return new InternalError(
    '未知错误',
    {
      traceId,
      originalError: String(error),
    }
  );
}

/**
 * 错误响应格式化选项
 */
export interface ErrorResponseOptions {
  includeStack?: boolean;
  includeMetadata?: boolean;
  traceId?: string;
}

/**
 * 将 AppError 转换为 NextResponse
 */
export function errorToResponse(
  error: AppError,
  options: ErrorResponseOptions = {}
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const includeStack = options.includeStack ?? isDevelopment;
  const includeMetadata = options.includeMetadata ?? isDevelopment;

  const responseBody = includeStack || includeMetadata
    ? error.toDetailedJSON()
    : error.toJSON();

  // 在开发环境中，移除不需要的字段
  if (!includeStack && 'stack' in responseBody) {
    delete responseBody.stack;
  }
  if (!includeMetadata && 'metadata' in responseBody) {
    delete responseBody.metadata;
  }

  return NextResponse.json(responseBody, { status: error.statusCode });
}

/**
 * API 路由错误处理包装器
 *
 * @example
 * export const POST = withErrorHandler(async (req) => {
 *   const data = await req.json();
 *   // ... 业务逻辑
 *   return NextResponse.json({ success: true });
 * });
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>): Promise<NextResponse> => {
    const traceId = generateTraceId();

    try {
      return await handler(...args);
    } catch (error) {
      const appError = normalizeError(error, traceId);

      // 记录错误日志
      logError(appError);

      return errorToResponse(appError, { traceId });
    }
  }) as T;
}

/**
 * 错误日志记录
 */
function logError(error: AppError): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 操作性错误（预期错误）使用 warn 级别
  if (error.isOperational) {
    console.warn('[AppError]', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      metadata: error.metadata,
    });
  } else {
    // 非操作性错误（程序错误）使用 error 级别
    console.error('[AppError]', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      metadata: error.metadata,
      stack: isDevelopment ? error.stack : undefined,
    });
  }
}

/**
 * 快捷响应函数：成功响应
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * 快捷响应函数：错误响应
 */
export function errorResponse(
  code: ErrorCode,
  message?: string,
  details?: ErrorDetails[],
  statusCode?: number
): NextResponse {
  const error = new AppError(code, message, details);
  if (statusCode) {
    (error as any).statusCode = statusCode;
  }
  return errorToResponse(error);
}

/**
 * 异步操作错误处理包装器
 *
 * 用于包装不应该抛出错误的异步操作（如后台任务、日志记录等）
 *
 * @example
 * await safeAsync(
 *   () => updateAnalytics(data),
 *   '更新分析数据失败'
 * );
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  errorMessage?: string,
  onError?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const message = errorMessage || '异步操作失败';
    console.error(`[SafeAsync] ${message}:`, error);

    if (onError && error instanceof Error) {
      try {
        onError(error);
      } catch (callbackError) {
        console.error('[SafeAsync] 错误回调执行失败:', callbackError);
      }
    }

    return null;
  }
}

/**
 * 同步操作错误处理包装器
 *
 * @example
 * const result = safeSync(
 *   () => JSON.parse(data),
 *   null,
 *   '解析 JSON 失败'
 * );
 */
export function safeSync<T>(
  fn: () => T,
  fallback: T,
  errorMessage?: string
): T {
  try {
    return fn();
  } catch (error) {
    const message = errorMessage || '同步操作失败';
    console.error(`[SafeSync] ${message}:`, error);
    return fallback;
  }
}
