/**
 * 快速记账 API 服务
 */

import { apiClient } from '../client';
import type { Transaction } from '@/types/domain/transaction';

/**
 * 快速记账参数
 */
export interface QuickTransactionParams {
  category: string;
  amount: number;
  note?: string;
  currency?: string;
  paymentMethod?: string | null;
}

/**
 * 快速记账 API 服务
 */
export const quickTransactionApi = {
  /**
   * 创建快速记账
   */
  create(params: QuickTransactionParams): Promise<Transaction> {
    return apiClient.post<Transaction>('/api/quick-transaction', params);
  },
};
