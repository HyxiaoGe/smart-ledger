/**
 * 预算 API 服务
 */

import { apiClient, buildQueryString } from '../client';

/**
 * 预算状态查询参数
 */
export interface BudgetStatusParams {
  year?: number;
  month?: number;
}

/**
 * 预算状态
 */
export interface BudgetStatus {
  category: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  isOverBudget: boolean;
}

/**
 * 预算汇总
 */
export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  categoryBreakdown: BudgetStatus[];
}

/**
 * 预算建议
 */
export interface BudgetSuggestion {
  category: string;
  suggestedAmount: number;
  reason: string;
  basedOn: string;
}

/**
 * 预算 API 服务
 */
export const budgetsApi = {
  /**
   * 获取预算执行状态
   */
  getStatus(params?: BudgetStatusParams): Promise<BudgetStatus[]> {
    const query = buildQueryString(params || {});
    return apiClient.get<BudgetStatus[]>(`/api/budgets/status${query}`);
  },

  /**
   * 获取预算汇总
   */
  getSummary(params?: BudgetStatusParams): Promise<BudgetSummary> {
    const query = buildQueryString(params || {});
    return apiClient.post<BudgetSummary>(`/api/budgets/summary${query}`);
  },

  /**
   * 获取预算建议
   */
  getSuggestions(): Promise<BudgetSuggestion[]> {
    return apiClient.get<BudgetSuggestion[]>('/api/budgets/suggestions');
  },

  /**
   * 预测预算
   */
  predict(): Promise<unknown> {
    return apiClient.get('/api/budgets/predict');
  },
};
