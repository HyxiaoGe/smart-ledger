import { supabase } from '@/lib/clients/supabase/client';

export type RecurringGenerationResult = {
  expense_name: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
};

/**
 * 手动触发固定账单生成（调用 Supabase 函数）
 */
export async function manualGenerateRecurring(): Promise<RecurringGenerationResult[]> {
  const { data, error } = await supabase.rpc('generate_recurring_transactions');

  if (error) {
    console.error('手动生成固定账单失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 查询固定账单生成历史
 */
export async function getGenerationHistory(limit = 20) {
  const { data, error } = await supabase
    .from('recurring_generation_logs')
    .select(`
      *,
      recurring_expense:recurring_expenses(name, amount, category),
      transaction:transactions(id, amount, note, date)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('查询生成历史失败:', error);
    throw error;
  }

  return data;
}

/**
 * 查询今日生成统计
 */
export async function getTodayGenerationStats() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('recurring_generation_logs')
    .select('*', { count: 'exact' })
    .eq('generation_date', today);

  if (error) {
    console.error('查询今日统计失败:', error);
    throw error;
  }

  const successCount = data?.filter(d => d.status === 'success').length || 0;
  const failedCount = data?.filter(d => d.status === 'failed').length || 0;

  return {
    total: data?.length || 0,
    success: successCount,
    failed: failedCount,
    date: today
  };
}
