/**
 * 月报告 API 客户端服务
 */

import { apiClient } from '../client';

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

export interface FixedExpenseItem {
  name: string;
  category: string;
  amount: number;
  count: number;
  recurring_expense_id: string | null;
}

export interface MonthlyReport {
  id: string;
  user_id: string | null;
  year: number;
  month: number;
  total_expenses: number;
  fixed_expenses: number;
  variable_expenses: number;
  transaction_count: number;
  fixed_transaction_count: number;
  variable_transaction_count: number;
  average_transaction: number | null;
  average_daily_expense: number | null;
  category_breakdown: CategoryStat[];
  fixed_expenses_breakdown: FixedExpenseItem[];
  top_merchants: MerchantStat[];
  payment_method_stats: PaymentMethodStat[];
  month_over_month_change: number | null;
  month_over_month_percentage: number | null;
  ai_insights: string | null;
  generated_at: string;
  generation_type: 'auto' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface MonthlyReportGenerationResult {
  success: boolean;
  message: string;
  data?: MonthlyReport;
}

export const monthlyReportsApi = {
  /**
   * 获取所有月报告
   */
  async list(): Promise<MonthlyReport[]> {
    // apiClient 会自动提取 response.data，所以直接返回结果
    return apiClient.get<MonthlyReport[]>('/api/monthly-reports');
  },

  /**
   * 获取某年的月报告
   */
  async listByYear(year: number): Promise<MonthlyReport[]> {
    return apiClient.get<MonthlyReport[]>(`/api/monthly-reports?year=${year}`);
  },

  /**
   * 获取特定月报告
   */
  async getByYearMonth(year: number, month: number): Promise<MonthlyReport | null> {
    return apiClient.get<MonthlyReport | null>(
      `/api/monthly-reports?year=${year}&month=${month}`
    );
  },

  /**
   * 获取单个月报告
   */
  async getById(id: string): Promise<MonthlyReport> {
    return apiClient.get<MonthlyReport>(`/api/monthly-reports/${id}`);
  },

  /**
   * 生成月报告
   */
  async generate(year: number, month: number): Promise<MonthlyReportGenerationResult> {
    const response = await apiClient.post<MonthlyReportGenerationResult>(
      '/api/monthly-reports',
      { year, month }
    );
    return response;
  },

  /**
   * 删除月报告
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/monthly-reports/${id}`);
  },
};
