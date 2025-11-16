import { NextRequest } from 'next/server';
import { supabase } from '@/lib/clients/supabase/client';
import { revalidateTag, revalidatePath } from 'next/cache';
import { formatDateToLocal } from '@/lib/utils/date';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { DatabaseError } from '@/lib/domain/errors/AppError';
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

  // 使用原子化的数据库函数来避免竞态条件
  const { data: transactionId, error: upsertError } = await supabase
    .rpc('upsert_transaction', {
      p_type: type,
      p_category: category,
      p_amount: amount,
      p_note: note,
      p_date: transactionDate,
      p_currency: currency,
      p_payment_method: null,
      p_merchant: null,
      p_subcategory: null,
      p_product: null
    });

  // 处理错误
  if (upsertError) {
    throw new DatabaseError('创建交易失败', undefined, { originalError: upsertError.message });
  }

  // 获取创建/更新后的记录
  const { data: result, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle();

  if (fetchError) {
    throw new DatabaseError('获取交易记录失败', undefined, { originalError: fetchError.message });
  }

  // ✅ 记录用户操作日志（异步，不阻塞响应）
  void logger.logUserAction({
    action: 'quick_transaction_created',
    metadata: {
      transaction_id: transactionId,
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

  return Response.json({
    success: true,
    transaction: result,
    message: '快速记账成功'
  });
});