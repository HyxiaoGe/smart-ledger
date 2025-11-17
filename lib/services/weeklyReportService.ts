import { supabase } from '@/lib/clients/supabase/client';

// 周报告数据结构
export interface WeeklyReport {
  id: string;
  user_id: string | null;
  week_start_date: string;
  week_end_date: string;
  total_expenses: number;
  transaction_count: number;
  average_transaction: number;
  category_breakdown: CategoryStat[];
  top_merchants: MerchantStat[];
  payment_method_stats: PaymentMethodStat[];
  week_over_week_change: number;
  ai_insights: string | null;
  generated_at: string;
  generation_type: 'auto' | 'manual';
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
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * 获取所有周报告列表
 */
export async function getAllWeeklyReports(): Promise<WeeklyReport[]> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('week_start_date', { ascending: false });

  if (error) {
    console.error('Error fetching weekly reports:', error);
    throw new Error('获取周报告列表失败');
  }

  return data || [];
}

/**
 * 根据ID获取单个周报告
 */
export async function getWeeklyReportById(id: string): Promise<WeeklyReport | null> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching weekly report:', error);
    return null;
  }

  return data;
}

/**
 * 获取最新的周报告
 */
export async function getLatestWeeklyReport(): Promise<WeeklyReport | null> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('week_start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching latest weekly report:', error);
    return null;
  }

  return data;
}

/**
 * 手动生成周报告
 */
export async function generateWeeklyReport(): Promise<WeeklyReport | null> {
  try {
    const { data, error } = await supabase.rpc('generate_weekly_report');

    if (error) {
      console.error('Error generating weekly report:', error);
      throw new Error('生成周报告失败');
    }

    return data;
  } catch (err) {
    console.error('Error in generateWeeklyReport:', err);
    throw err;
  }
}

/**
 * 格式化日期范围显示
 */
export function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.getMonth() + 1;
  const startDay = start.getDate();
  const endMonth = end.getMonth() + 1;
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth}月${startDay}日 - ${endDay}日`;
  } else {
    return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
  }
}

/**
 * 获取周数描述（今年第几周）
 */
export function getWeekDescription(date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();

  // 计算是今年第几周
  const firstDayOfYear = new Date(year, 0, 1);
  const daysDiff = Math.floor((d.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.ceil((daysDiff + firstDayOfYear.getDay() + 1) / 7);

  return `${year}年第${weekNumber}周`;
}
