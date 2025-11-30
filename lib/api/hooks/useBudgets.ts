'use client';

/**
 * 预算相关 React Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { budgetsApi, type BudgetQueryParams } from '../services/budgets';

/**
 * 获取预算执行状态
 */
export function useBudgetStatus(params?: BudgetQueryParams) {
  return useQuery({
    queryKey: queryKeys.budgets.status(params),
    queryFn: () => budgetsApi.getStatus(params),
  });
}

/**
 * 获取预算汇总
 */
export function useBudgetSummary(params?: BudgetQueryParams) {
  return useQuery({
    queryKey: queryKeys.budgets.summary(params),
    queryFn: () => budgetsApi.getSummary(params),
  });
}

/**
 * 获取预算建议
 */
export function useBudgetSuggestions() {
  return useQuery({
    queryKey: queryKeys.budgets.suggestions(),
    queryFn: () => budgetsApi.getSuggestions(),
    staleTime: 30 * 60 * 1000, // 30分钟内不重新获取
  });
}
