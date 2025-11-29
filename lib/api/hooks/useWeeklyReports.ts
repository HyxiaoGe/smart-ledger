'use client';

/**
 * 周报告相关 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { weeklyReportsApi } from '../services/weekly-reports';

/**
 * 获取周报告列表
 */
export function useWeeklyReports() {
  return useQuery({
    queryKey: queryKeys.weeklyReports.list(),
    queryFn: () => weeklyReportsApi.list(),
  });
}

/**
 * 获取单个周报告
 */
export function useWeeklyReport(id: string) {
  return useQuery({
    queryKey: queryKeys.weeklyReports.detail(id),
    queryFn: () => weeklyReportsApi.get(id),
    enabled: !!id,
  });
}

/**
 * 获取最新周报告
 */
export function useLatestWeeklyReport() {
  return useQuery({
    queryKey: queryKeys.weeklyReports.latest(),
    queryFn: () => weeklyReportsApi.getLatest(),
  });
}

/**
 * 生成周报告
 */
export function useGenerateWeeklyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => weeklyReportsApi.generate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyReports.all });
    },
  });
}
