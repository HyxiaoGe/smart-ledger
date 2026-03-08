'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { monthlyReportsApi } from '../services/monthly-reports';

export function useMonthlyReports(year?: number) {
  return useQuery({
    queryKey: queryKeys.monthlyReports.list(year),
    queryFn: () => (year ? monthlyReportsApi.listByYear(year) : monthlyReportsApi.list()),
  });
}

export function useMonthlyReport(id: string) {
  return useQuery({
    queryKey: queryKeys.monthlyReports.detail(id),
    queryFn: () => monthlyReportsApi.getById(id),
    enabled: !!id,
  });
}

export function useMonthlyReportByYearMonth(year: number, month: number, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.monthlyReports.byYearMonth(year, month),
    queryFn: () => monthlyReportsApi.getByYearMonth(year, month),
    enabled,
  });
}

export function useGenerateMonthlyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      monthlyReportsApi.generate(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.monthlyReports.all });
    },
  });
}
