/**
 * 周报告 API 服务
 */

import { apiClient } from '../client';

/**
 * 分类统计
 */
export interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * 商家统计
 */
export interface MerchantStat {
  merchant: string;
  amount: number;
  count: number;
}

/**
 * 支付方式统计
 */
export interface PaymentMethodStat {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * 周报告
 */
export interface WeeklyReport {
  id: string;
  user_id: string | null;
  week_start_date: string;
  week_end_date: string;
  total_expenses: number;
  transaction_count: number;
  average_transaction: number | null;
  category_breakdown: CategoryStat[];
  top_merchants: MerchantStat[];
  payment_method_stats: PaymentMethodStat[];
  week_over_week_change: number | null;
  week_over_week_percentage: number;
  ai_insights: string | null;
  generated_at: string;
  generation_type: 'auto' | 'manual';
}

/**
 * 生成周报告结果
 */
export interface GenerateReportResult {
  success: boolean;
  message: string;
}

/**
 * 周报告 API 服务
 */
export const weeklyReportsApi = {
  /**
   * 获取周报告列表
   */
  list(): Promise<WeeklyReport[]> {
    return apiClient.get<WeeklyReport[]>('/api/weekly-reports');
  },

  /**
   * 获取单个周报告
   */
  get(id: string): Promise<WeeklyReport> {
    return apiClient.get<WeeklyReport>(`/api/weekly-reports/${id}`);
  },

  /**
   * 获取最新周报告
   */
  getLatest(): Promise<WeeklyReport | null> {
    return apiClient.get<WeeklyReport | null>('/api/weekly-reports/latest');
  },

  /**
   * 生成周报告
   */
  generate(): Promise<GenerateReportResult> {
    return apiClient.post<GenerateReportResult>('/api/weekly-reports/generate');
  },
};
