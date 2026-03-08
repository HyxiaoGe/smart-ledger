import { getTransactionDashboardData } from '@/lib/services/transactions.server';
import type { HomePageRequestParams } from '@/lib/services/transaction/pageParams';

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

export async function loadPageData(params: HomePageRequestParams): Promise<PageData> {
  return getTransactionDashboardData({
    currency: params.currency,
    month: params.monthLabel,
    range: params.range,
    startDate: params.start,
    endDate: params.end,
  });
}
