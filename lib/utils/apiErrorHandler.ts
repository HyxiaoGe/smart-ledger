import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from '@/lib/core/logger';

/**
 * API 路由错误处理包装器
 * 统一捕获和处理 API 路由中的所有错误
 *
 * @example
 * export const GET = withErrorHandler(async (req) => {
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * });
 */
export function withErrorHandler<T extends (req: NextRequest, context?: any) => Promise<Response>>(
  handler: T
): T {
  return (async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error: any) {
      // 使用 Pino logger 记录错误
      logger.error({
        url: req.url,
        method: req.method,
        error: error.message,
        stack: error.stack,
        name: error.name,
      }, 'API请求错误');

      // Zod 验证错误
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
          { status: 400 }
        );
      }

      // 已知的业务错误（带 statusCode 属性）
      if (error.statusCode && typeof error.statusCode === 'number') {
        return NextResponse.json(
          {
            error: error.message || 'Request failed',
          },
          { status: error.statusCode }
        );
      }

      // 开发环境返回详细错误信息
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          {
            error: 'Internal server error',
            message: error.message,
            stack: error.stack,
          },
          { status: 500 }
        );
      }

      // 生产环境返回通用错误信息
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: '服务器内部错误，请稍后重试',
        },
        { status: 500 }
      );
    }
  }) as T;
}

/**
 * 创建业务错误类
 * 可以指定 HTTP 状态码
 *
 * @example
 * throw new ApiError('用户不存在', 404);
 */
export class ApiError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}
