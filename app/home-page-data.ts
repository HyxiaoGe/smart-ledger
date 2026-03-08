import { formatMonth } from '@/lib/utils/date';
import { getTransactionDashboardData } from '@/lib/services/transactions.server';

export type PageData = {
  rangeExpense: number;
  rangeIncome: number;
  rangeCount: number;
  rangeDailyAvg: number;
  rangeLabel: string;
  rangeRows: any[];
  isSingleDay: boolean;
  isToday: boolean;
  prevRangeExpense: number;
  prevRangeLabel: string;
  trend: { name: string; expense: number }[];
  pie: { name: string; value: number }[];
  top10: any[];
  calendarData: { date: string; amount: number; count: number }[];
  calendarYear: number;
  calendarMonth: number;
  refreshSnapshot: string;
};

export function resolveMonthLabel(monthParam?: string): string {
  return monthParam || formatMonth(new Date());
}

export async function loadPageData(
  currency: string,
  monthLabel: string,
  rangeParam: string,
  startParam?: string,
  endParam?: string
): Promise<PageData> {
  const dashboardData = await getTransactionDashboardData({
    currency,
    month: monthLabel,
    range: rangeParam,
    startDate: startParam,
    endDate: endParam,
  });

  return {
    ...dashboardData,
    refreshSnapshot: buildPageDataRefreshSnapshot({
      rangeExpense: dashboardData.rangeExpense,
      rangeCount: dashboardData.rangeCount,
    }),
  };
}

export function buildPageDataRefreshSnapshot(input: {
  rangeExpense: number;
  rangeCount: number;
}) {
  return [input.rangeExpense, input.rangeCount].join(':');
}
