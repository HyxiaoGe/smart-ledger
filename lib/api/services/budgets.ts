/**
 * 预算 API 服务
 */

import { apiClient, buildQueryString } from '../client';

/**
 * 预算查询参数
 */
export interface BudgetQueryParams {
  year?: number;
  month?: number;
  currency?: string;
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
 * 预算汇总 (API 返回格式)
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
 * 预算建议
 */
export interface BudgetSuggestion {
  categoryKey: string;
  suggestedAmount: number;
  confidenceLevel: string;
  reason: string;
  historicalAvg: number;
  historicalMonths: number;
  currentMonthSpending: number;
  currentDailyRate: number;
  predictedMonthTotal: number;
  trendDirection: string;
  daysIntoMonth: number;
  calculatedAt: string;
}

/**
 * 预算预测参数
 */
export interface BudgetPredictParams {
  categoryKey: string;
  year: number;
  month: number;
  budgetAmount: number;
  currency?: string;
}

export interface BudgetUpsertParams {
  year: number;
  month: number;
  categoryKey: string | null;
  amount: number;
  alertThreshold?: number;
}

/**
 * 预算预测结果
 */
export interface BudgetPrediction {
  current_spending: number;
  daily_rate: number;
  predicted_total: number;
  days_passed: number;
  days_remaining: number;
  will_exceed_budget: boolean;
  predicted_overage?: number;
}

/**
 * 预算 API 服务
 */
export const budgetsApi = {
  /**
   * 获取预算执行状态
   */
  getStatus(params?: BudgetQueryParams): Promise<BudgetStatus[]> {
    const query = buildQueryString(params || {});
    return apiClient.get<BudgetStatus[]>(`/api/budgets/status${query}`);
  },

  /**
   * 获取预算汇总
   */
  getSummary(params?: BudgetQueryParams): Promise<TotalBudgetSummary> {
    const query = buildQueryString(params || {});
    return apiClient.get<TotalBudgetSummary>(`/api/budgets/summary${query}`);
  },

  /**
   * 获取预算建议
   */
  getSuggestions(params?: { year?: number; month?: number }): Promise<BudgetSuggestion[]> {
    const query = buildQueryString(params || {});
    return apiClient.get<BudgetSuggestion[]>(`/api/budgets/suggestions${query}`);
  },

  /**
   * 预测分类预算
   */
  predict(params: BudgetPredictParams): Promise<BudgetPrediction> {
    return apiClient.post<BudgetPrediction>('/api/budgets/predict', params);
  },

  /**
   * 设置或更新预算
   */
  setBudget(params: BudgetUpsertParams): Promise<{ success: boolean; id: string }> {
    return apiClient.post<{ success: boolean; id: string }>('/api/budgets', params);
  }
};
