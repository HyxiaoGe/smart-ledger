/**
 * 周报告 API 服务
 */

import { apiClient } from '../client';

/**
 * 周报告
 */
export interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  total_expense: number;
  total_income: number;
  category_breakdown: Record<string, number>;
  ai_summary?: string;
  insights?: unknown[];
  created_at: string;
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
  generate(): Promise<WeeklyReport> {
    return apiClient.post<WeeklyReport>('/api/weekly-reports/generate');
  },
};
