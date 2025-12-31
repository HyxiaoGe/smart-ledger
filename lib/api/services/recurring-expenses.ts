/**
 * 定期支出 API 服务
 */

import { apiClient } from '../client';

/**
 * 频率配置
 */
export interface FrequencyConfig {
  day_of_month?: number;
  days_of_week?: number[];
}

/**
 * 定期支出
 */
export interface RecurringExpense {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  frequency_config?: FrequencyConfig;
  day_of_week?: number;
  day_of_month?: number;
  month_of_year?: number;
  start_date: string;
  end_date?: string;
  note?: string;
  skip_holidays?: boolean;
  is_active: boolean;
  last_generated?: string;
  last_generated_at?: string;
  next_generate?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 创建定期支出参数
 */
export interface CreateRecurringExpenseParams {
  name: string;
  category: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  frequency_config?: Record<string, unknown>;
  day_of_week?: number;
  day_of_month?: number;
  month_of_year?: number;
  start_date: string;
  end_date?: string | null;
  note?: string;
  skip_holidays?: boolean;
  is_active?: boolean;
}

/**
 * 更新定期支出参数
 */
export interface UpdateRecurringExpenseParams extends Partial<CreateRecurringExpenseParams> {
  is_active?: boolean;
}

/**
 * 生成历史记录
 */
export interface RecurringGenerationHistory {
  id: string;
  recurring_expense_id: string;
  generated_transaction_id?: string | null;
  status?: 'success' | 'failed' | 'skipped';
  reason?: string;
  created_at: string;
  recurring_expense?: {
    name: string;
    amount: number;
    category: string;
  };
  transaction?: {
    id: string;
    amount: number;
    note: string;
    date: string;
  };
}

/**
 * 定期支出 API 服务
 */
export const recurringExpensesApi = {
  /**
   * 获取定期支出列表
   */
  list(): Promise<RecurringExpense[]> {
    return apiClient.get<RecurringExpense[]>('/api/recurring-expenses');
  },

  /**
   * 获取单个定期支出
   */
  get(id: string): Promise<RecurringExpense> {
    return apiClient.get<RecurringExpense>(`/api/recurring-expenses/${id}`);
  },

  /**
   * 创建定期支出
   */
  create(data: CreateRecurringExpenseParams): Promise<RecurringExpense> {
    return apiClient.post<RecurringExpense>('/api/recurring-expenses', data);
  },

  /**
   * 更新定期支出
   */
  update(id: string, data: UpdateRecurringExpenseParams): Promise<RecurringExpense> {
    return apiClient.put<RecurringExpense>(`/api/recurring-expenses/${id}`, data);
  },

  /**
   * 删除定期支出
   */
  delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/recurring-expenses/${id}`);
  },

  /**
   * 手动生成定期支出交易
   */
  generate(params?: { includeOverdue?: boolean }): Promise<{ count: number }> {
    const query = params?.includeOverdue ? '?includeOverdue=1' : '';
    return apiClient.post<{ count: number }>(`/api/recurring-expenses/generate${query}`);
  },

  /**
   * 获取生成历史
   */
  getHistory(limit?: number): Promise<RecurringGenerationHistory[]> {
    const query = limit ? `?limit=${limit}` : '';
    return apiClient.get<RecurringGenerationHistory[]>(`/api/recurring/history${query}`);
  },
};
