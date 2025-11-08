import { NextRequest } from 'next/server';
import { supabase } from '@/lib/clients/supabase/client';
import { revalidateTag, revalidatePath } from 'next/cache';
import { formatDateToLocal } from '@/lib/utils/date';

export const runtime = 'nodejs';

/**
 * 快速记账API - 简化版本
 * 支持一键快速记录常见消费
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, amount, note, currency = 'CNY', date } = body;

    // 验证必填字段
    if (!category || !amount || !note) {
      return new Response(
        JSON.stringify({ error: '缺少必填字段：category, amount, note' }),
        { status: 400 }
      );
    }

    // 验证金额
    if (typeof amount !== 'number' || amount <= 0) {
      return new Response(
        JSON.stringify({ error: '金额必须大于0' }),
        { status: 400 }
      );
    }

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

    return Response.json({
      success: true,
      transaction: result,
      message: '快速记账成功'
    });

  } catch (err: any) {
    console.error('快速记账失败:', err);
    return new Response(
      JSON.stringify({
        error: err.message || '快速记账失败',
        details: err.details || null
      }),
      { status: 500 }
    );
  }
}