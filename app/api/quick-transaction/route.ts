import { NextRequest } from 'next/server';
import { supabase } from '@/lib/clients/supabase/client';
import { revalidateTag, revalidatePath } from 'next/cache';
import { formatDateToLocal } from '@/lib/utils/date';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import { createRequestLogger, startPerformanceMeasure } from '@/lib/core/logger';

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
export async function POST(req: NextRequest) {
  const log = createRequestLogger('/api/quick-transaction', req);
  const measure = startPerformanceMeasure();

  try {
    log.info('快速记账请求开始');
    const body = await req.json();

    // 验证输入
    const validation = validateRequest(quickTransactionSchema, body);
    if (!validation.success) {
      log.warn('请求参数验证失败');
      return validation.response;
    }

    const { category, amount, note, currency, date } = validation.data;

    const type = 'expense';
    const transactionDate = date || formatDateToLocal(new Date());

    log.info({
      category,
      amount,
      currency,
      date: transactionDate
    }, '准备插入快速记账记录');

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
      throw upsertError;
    }

    // 获取创建/更新后的记录
    const { data: result, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    // 刷新缓存 - 确保页面显示最新数据
    revalidateTag('transactions');
    revalidatePath('/');
    revalidatePath('/records');

    log.info({
      ...measure(),
      transactionId,
      category,
      amount
    }, '快速记账成功');

    return Response.json({
      success: true,
      transaction: result,
      message: '快速记账成功'
    });

  } catch (err: any) {
    log.error({
      ...measure(),
      error: err.message,
      details: err.details,
      code: err.code
    }, '快速记账失败');

    return new Response(
      JSON.stringify({
        error: err.message || '快速记账失败',
        details: err.details || null
      }),
      { status: 500 }
    );
  }
}