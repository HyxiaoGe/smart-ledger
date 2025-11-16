import { supabase } from '@/lib/clients/supabase/client';

/**
 * 周报告数据结构
 */
export interface WeeklyReport {
  id: number;
  week_start_date: string;
  week_end_date: string;
  total_expenses: number;
  transaction_count: number;
  category_breakdown: CategoryStat[];
  top_merchants: MerchantStat[];
  payment_method_breakdown: PaymentMethodStat[];
  ai_summary: string | null;
  ai_insights: string[] | null;
  week_over_week_change: number | null;
  week_over_week_percentage: number | null;
  created_at: string;
  generated_by: string;
}

export interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface MerchantStat {
  merchant: string;
  amount: number;
  count: number;
}

export interface PaymentMethodStat {
  payment_method: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * 获取所有周报告列表
 */
export async function getAllWeeklyReports(limit = 20): Promise<WeeklyReport[]> {
  const { data, error } = await supabase
    .from('weekly_consumption_reports')
    .select('*')
    .order('week_start_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取周报告列表失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 根据 ID 获取单个周报告
 */
export async function getWeeklyReportById(id: number): Promise<WeeklyReport | null> {
  const { data, error } = await supabase
    .from('weekly_consumption_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('获取周报告详情失败:', error);
    throw error;
  }

  return data;
}

/**
 * 获取最新的周报告
 */
export async function getLatestWeeklyReport(): Promise<WeeklyReport | null> {
  const { data, error } = await supabase
    .from('weekly_consumption_reports')
    .select('*')
    .order('week_start_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 没有数据
      return null;
    }
    console.error('获取最新周报告失败:', error);
    throw error;
  }

  return data;
}

/**
 * 手动触发生成周报告
 */
export async function generateWeeklyReport(): Promise<any> {
  const { data, error } = await supabase.rpc('generate_weekly_consumption_report');

  if (error) {
    console.error('生成周报告失败:', error);
    throw error;
  }

  return data;
}

/**
 * 格式化日期范围
 */
export function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startStr = start.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });

  const endStr = end.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });

  return `${startStr} - ${endStr}`;
}

/**
 * 获取周数描述
 */
export function getWeekDescription(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();

  // 计算距离现在多少周
  const diffTime = now.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

  if (diffWeeks === 0) return '本周';
  if (diffWeeks === 1) return '上周';
  if (diffWeeks === 2) return '两周前';
  if (diffWeeks === 3) return '三周前';
  if (diffWeeks === 4) return '四周前';
  if (diffWeeks <= 8) return `${diffWeeks} 周前`;

  // 超过8周，显示月份
  const month = start.getMonth() + 1;
  return `${month}月`;
}
