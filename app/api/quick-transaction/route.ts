import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/clients/db';
import { revalidateTag, revalidatePath } from 'next/cache';
import { formatDateToLocal } from '@/lib/utils/date';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { logger } from '@/lib/services/logging';

export const runtime = 'nodejs';

// 验证 schema
const quickTransactionSchema = z.object({
  category: commonSchemas.nonEmptyString,
  amount: commonSchemas.amount,
  note: commonSchemas.nonEmptyString,
  currency: commonSchemas.currency.optional().default('CNY'),
  date: z.string().optional()
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

  const { category, amount, note, currency, date } = validation.data;

  const type = 'expense';
  const transactionDate = date || formatDateToLocal(new Date());

  // 创建交易记录
  const prisma = getPrismaClient();
  const result = await prisma.transactions.create({
    data: {
      type,
      category,
      amount,
      note,
      date: transactionDate,
      currency,
      payment_method: null,
      merchant: null,
      subcategory: null,
      product: null,
    },
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

  // 刷新缓存 - 确保页面显示最新数据
  revalidateTag('transactions');
  revalidatePath('/');
  revalidatePath('/records');

  return NextResponse.json({
    success: true,
    transaction: result,
    message: '快速记账成功'
  });
});