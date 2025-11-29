'use client';

/**
 * 支付方式相关 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import {
  paymentMethodsApi,
  type CreatePaymentMethodParams,
  type UpdatePaymentMethodParams,
} from '../services/payment-methods';

/**
 * 获取支付方式列表
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.paymentMethods.list(),
    queryFn: () => paymentMethodsApi.list(),
  });
}

/**
 * 创建支付方式
 */
export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentMethodParams) => paymentMethodsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
    },
  });
}

/**
 * 更新支付方式
 */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdatePaymentMethodParams) =>
      paymentMethodsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
    },
  });
}

/**
 * 删除支付方式
 */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentMethodsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
    },
  });
}
