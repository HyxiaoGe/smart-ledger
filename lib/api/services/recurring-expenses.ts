/**
 * 定期支出 API 服务
 */

import { apiClient } from '../client';

/**
 * 定期支出
 */
export interface RecurringExpense {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  day_of_week?: number;
  day_of_month?: number;
  month_of_year?: number;
  start_date: string;
  end_date?: string;
  note?: string;
  is_active: boolean;
  last_generated_at?: string;
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
  day_of_week?: number;
  day_of_month?: number;
  month_of_year?: number;
  start_date: string;
  end_date?: string;
  note?: string;
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
  generated_at: string;
  transaction_id: string;
  amount: number;
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
  generate(): Promise<{ count: number }> {
    return apiClient.post<{ count: number }>('/api/recurring-expenses/generate');
  },

  /**
   * 获取生成历史
   */
  getHistory(): Promise<RecurringGenerationHistory[]> {
    return apiClient.get<RecurringGenerationHistory[]>('/api/recurring/history');
  },
};
