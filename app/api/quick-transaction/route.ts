import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { revalidateTag, revalidatePath } from 'next/cache';

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
    const transactionDate = date || new Date().toISOString().slice(0, 10);

    // 检查是否存在相同业务记录（包括已删除的）
    const { data: existingRecord, error: queryError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', type)
      .eq('category', category)
      .eq('date', transactionDate)
      .eq('currency', currency)
      .eq('note', note)
      .single();

    let transactionError;
    let result;

    if (existingRecord) {
      if (existingRecord.deleted_at) {
        // 记录已删除，替换为新金额而不是累加
        const { data: updatedRecord, error: updateError } = await supabase
          .from('transactions')
          .update({
            amount: amount, // 使用新金额，不累加
            deleted_at: null // 恢复记录
          })
          .eq('id', existingRecord.id)
          .select()
          .single();

        transactionError = updateError;
        result = updatedRecord;
      } else {
        // 记录未删除，累加金额
        const { data: updatedRecord, error: updateError } = await supabase
          .from('transactions')
          .update({
            amount: existingRecord.amount + amount
          })
          .eq('id', existingRecord.id)
          .select()
          .single();

        transactionError = updateError;
        result = updatedRecord;
      }
    } else {
      // 不存在任何记录，插入新记录
      const { data: newRecord, error: insertError } = await supabase
        .from('transactions')
        .insert([{
          type,
          category,
          amount,
          note,
          date: transactionDate,
          currency
        }])
        .select()
        .single();

      transactionError = insertError;
      result = newRecord;
    }

    // 处理查询和更新/插入错误
    if (queryError && queryError.code !== 'PGRST116') { // PGRST116表示没有找到记录
      throw queryError;
    }

    if (transactionError) {
      throw transactionError;
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