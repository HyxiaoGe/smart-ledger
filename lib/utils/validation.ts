import { NextResponse } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * 验证请求数据的通用工具函数
 * @param schema Zod 验证 schema
 * @param data 需要验证的数据
 * @returns 验证成功返回数据，失败返回 NextResponse 错误
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            details: formattedErrors
          },
          { status: 400 }
        )
      };
    }

    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    };
  }
}

/**
 * 常用的验证 schema
 */
export const commonSchemas = {
  // UUID 格式验证
  uuid: z.string().uuid({ message: 'Invalid UUID format' }),

  // 日期格式验证 (YYYY-MM-DD)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date format. Expected YYYY-MM-DD' }),

  // 金额验证（必须为正数）
  amount: z.number().positive({ message: 'Amount must be greater than 0' }),

  // 币种验证
  currency: z.enum(['CNY', 'USD'], { message: 'Currency must be CNY or USD' }),

  // 交易类型验证
  transactionType: z.enum(['income', 'expense'], { message: 'Type must be income or expense' }),

  // 非空字符串
  nonEmptyString: z.string().min(1, { message: 'Field cannot be empty' }),

  // 月份格式验证 (YYYY-MM)
  month: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Invalid month format. Expected YYYY-MM' }),
};
