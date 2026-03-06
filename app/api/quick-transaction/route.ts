import { NextRequest, NextResponse } from 'next/server';
import { formatDateToLocal } from '@/lib/utils/date';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { logger } from '@/lib/services/logging';
import { createTransaction } from '@/lib/services/transactions.server';
import { revalidateTransactionWrite } from '@/lib/services/transaction/revalidation.server';

export const runtime = 'nodejs';

// 验证 schema
const quickTransactionSchema = z.object({
  category: commonSchemas.nonEmptyString,
  amount: commonSchemas.amount,
  note: commonSchemas.nonEmptyString,
  currency: commonSchemas.currency.optional().default('CNY'),
  date: z.string().optional(),
  paymentMethod: z.string().nullable().optional(),
});

/**
 * 快速记账API - 简化版本
 * 支持一键快速记录常见消费
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();

  // 验证输入
  const validation = validateRequest(quickTransactionSchema, body);
  if (!validation.success) {
    return validation.response;
  }

  const { category, amount, note, currency, date, paymentMethod } = validation.data;

  const result = await createTransaction({
    type: 'expense',
    category,
    amount,
    note,
    date: date || formatDateToLocal(new Date()),
    currency,
    payment_method: paymentMethod || undefined,
  });

  // ✅ 记录用户操作日志（异步，不阻塞响应）
  void logger.logUserAction({
    action: 'quick_transaction_created',
    metadata: {
      transaction_id: result?.id,
      category,
      amount,
      currency,
      note: note.substring(0, 50), // 只记录前50字符
    },
  });

  revalidateTransactionWrite({ includeCommonNotes: true });

  return NextResponse.json({
    success: true,
    transaction: result,
    message: '快速记账成功'
  });
});
