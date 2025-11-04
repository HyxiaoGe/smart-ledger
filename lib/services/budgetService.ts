import { supabase } from '@/lib/clients/supabase/client';

/**
 * 预算定义
 */
export interface Budget {
  id: string;
  year: number;
  month: number;
  category_key: string | null; // null 表示总预算
  amount: number;
  alert_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 预算执行状态
 */
export interface BudgetStatus {
  id: string;
  category_key: string | null;
  category_label: string;
  category_icon: string | null;
  category_color: string | null;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  usage_percentage: number;
  alert_threshold: number;
  is_over_budget: boolean;
  is_near_limit: boolean;
  transaction_count: number;
}

/**
 * 总预算汇总
 */
export interface TotalBudgetSummary {
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  usage_percentage: number;
  category_budgets_count: number;
  over_budget_count: number;
  near_limit_count: number;
}

/**
 * 预算历史记录
 */
export interface BudgetHistory {
  year: number;
  month: number;
  budget_amount: number;
  spent_amount: number;
  usage_percentage: number;
}

/**
 * 设置或更新预算
 */
export async function setBudget(params: {
  year: number;
  month: number;
  categoryKey: string | null;
  amount: number;
  alertThreshold?: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc('set_budget', {
    p_year: params.year,
    p_month: params.month,
    p_category_key: params.categoryKey,
    p_amount: params.amount,
    p_alert_threshold: params.alertThreshold || 0.80,
  });

  if (error) {
    console.error('设置预算失败:', error);
    throw error;
  }

  return data;
}

/**
 * 获取本月预算执行情况
 */
export async function getMonthlyBudgetStatus(
  year: number,
  month: number
): Promise<BudgetStatus[]> {
  const { data, error } = await supabase.rpc('get_monthly_budget_status', {
    p_year: year,
    p_month: month,
  });

  if (error) {
    console.error('获取预算执行情况失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取总预算汇总
 */
export async function getTotalBudgetSummary(
  year: number,
  month: number
): Promise<TotalBudgetSummary> {
  const { data, error } = await supabase.rpc('get_total_budget_summary', {
    p_year: year,
    p_month: month,
  });

  if (error) {
    console.error('获取总预算汇总失败:', error);
    throw error;
  }

  return data[0];
}

/**
 * 删除预算
 */
export async function deleteBudget(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_budget', {
    p_id: id,
  });

  if (error) {
    console.error('删除预算失败:', error);
    throw error;
  }

  return data;
}

/**
 * 获取预算历史数据
 */
export async function getBudgetHistory(
  categoryKey: string | null = null,
  months: number = 6
): Promise<BudgetHistory[]> {
  const { data, error } = await supabase.rpc('get_budget_history', {
    p_category_key: categoryKey,
    p_months: months,
  });

  if (error) {
    console.error('获取预算历史失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取当前年月
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/**
 * 格式化月份显示
 */
export function formatMonth(year: number, month: number): string {
  return `${year}年${month}月`;
}

/**
 * 获取预算使用状态标签
 */
export function getBudgetStatusLabel(status: BudgetStatus): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  if (status.is_over_budget) {
    return {
      label: '超支',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      icon: '⚠️',
    };
  }

  if (status.is_near_limit) {
    return {
      label: '接近上限',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      icon: '⚡',
    };
  }

  if (status.usage_percentage >= 50) {
    return {
      label: '进行中',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      icon: '📊',
    };
  }

  return {
    label: '充足',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: '✅',
  };
}

/**
 * 计算进度条颜色
 */
export function getProgressBarColor(percentage: number, isOverBudget: boolean): string {
  if (isOverBudget) return 'bg-red-500';
  if (percentage >= 80) return 'bg-orange-500';
  if (percentage >= 50) return 'bg-blue-500';
  return 'bg-green-500';
}
