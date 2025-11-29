/**
 * 支付方式 API 服务
 */

import { apiClient } from '../client';

/**
 * 支付方式类型
 */
export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 创建支付方式参数
 */
export interface CreatePaymentMethodParams {
  name: string;
  type: string;
  icon?: string;
  color?: string;
  is_default?: boolean;
}

/**
 * 更新支付方式参数
 */
export interface UpdatePaymentMethodParams extends Partial<CreatePaymentMethodParams> {
  is_active?: boolean;
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
   * 删除支付方式
   */
  delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/payment-methods/${id}`);
  },
};
