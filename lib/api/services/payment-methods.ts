/**
 * 支付方式 API 服务
 */

import { apiClient } from '../client';

/**
 * 支付方式类型
 */
export interface PaymentMethod {
  id: string;
  user_id?: string | null;
  name: string;
  type: 'credit_card' | 'debit_card' | 'alipay' | 'wechat' | 'cash' | 'other';
  icon?: string | null;
  color?: string | null;
  last_4_digits?: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order?: number;
  usage_count?: number;
  last_used?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 创建支付方式参数
 */
export interface CreatePaymentMethodParams {
  name: string;
  type: PaymentMethod['type'];
  icon?: string;
  color?: string;
  last4Digits?: string;
  is_default?: boolean;
}

/**
 * 更新支付方式参数
 */
export interface UpdatePaymentMethodParams extends Partial<CreatePaymentMethodParams> {
  is_active?: boolean;
  setDefault?: boolean;
}

/**
 * 删除支付方式结果
 */
export interface DeletePaymentMethodResult {
  success: boolean;
  message: string;
  transaction_count: number;
}

/**
 * 支付方式 API 服务
 */
export const paymentMethodsApi = {
  /**
   * 获取支付方式列表
   */
  list(): Promise<PaymentMethod[]> {
    return apiClient.get<PaymentMethod[]>('/api/payment-methods');
  },

  /**
   * 创建支付方式
   */
  create(data: CreatePaymentMethodParams): Promise<PaymentMethod> {
    return apiClient.post<PaymentMethod>('/api/payment-methods', data);
  },

  /**
   * 更新支付方式
   */
  update(id: string, data: UpdatePaymentMethodParams): Promise<PaymentMethod> {
    return apiClient.put<PaymentMethod>(`/api/payment-methods/${id}`, data);
  },

  /**
   * 设置默认支付方式
   */
  setDefault(id: string): Promise<boolean> {
    return apiClient.put<boolean>(`/api/payment-methods/${id}`, { setDefault: true });
  },

  /**
   * 删除支付方式
   */
  delete(id: string, migrateToId?: string): Promise<DeletePaymentMethodResult> {
    return apiClient.delete<DeletePaymentMethodResult>(`/api/payment-methods/${id}`, {
      data: migrateToId ? { migrateToId } : undefined
    });
  },
};
