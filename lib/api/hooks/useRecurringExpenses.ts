'use client';

/**
 * 定期支出相关 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import {
  recurringExpensesApi,
  type CreateRecurringExpenseParams,
  type UpdateRecurringExpenseParams,
} from '../services/recurring-expenses';

/**
 * 获取定期支出列表
 */
export function useRecurringExpenses() {
  return useQuery({
    queryKey: queryKeys.recurringExpenses.list(),
    queryFn: () => recurringExpensesApi.list(),
  });
}

/**
 * 获取单个定期支出
 */
export function useRecurringExpense(id: string) {
  return useQuery({
    queryKey: queryKeys.recurringExpenses.detail(id),
    queryFn: () => recurringExpensesApi.get(id),
    enabled: !!id,
  });
}

/**
 * 获取生成历史
 */
export function useRecurringExpenseHistory() {
  return useQuery({
    queryKey: queryKeys.recurringExpenses.history(),
    queryFn: () => recurringExpensesApi.getHistory(),
  });
}

/**
 * 创建定期支出
 */
export function useCreateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecurringExpenseParams) => recurringExpensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all });
    },
  });
}

/**
 * 更新定期支出
 */
export function useUpdateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateRecurringExpenseParams) =>
      recurringExpensesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.list() });
    },
  });
}

/**
 * 删除定期支出
 */
export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recurringExpensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all });
    },
  });
}

/**
 * 手动生成定期支出交易
 */
export function useGenerateRecurringExpenses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => recurringExpensesApi.generate(),
    onSuccess: () => {
      // 生成后刷新交易列表和定期支出历史
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.history() });
    },
  });
}
