import { getPrismaClient } from '@/lib/clients/db';
import { formatDateToLocal, formatMonth } from '@/lib/utils/date';
import { getTransactionDashboardData } from '@/lib/services/transactions.server';

type RecurringExpense = {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: string;
  frequency_config: Record<string, any>;
  start_date: string;
  note?: string;
  currency: string;
  payment_method?: string;
  is_active: boolean;
  last_generated_date?: string;
  created_at: string;
  updated_at: string;
};

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
  recurringExpenses: RecurringExpense[];
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
  const [dashboardData, recurringData] = await Promise.all([
    getTransactionDashboardData({
      currency,
      month: monthLabel,
      range: rangeParam,
      startDate: startParam,
      endDate: endParam,
    }),
    loadRecurringExpenses(),
  ]);

  return {
    ...dashboardData,
    recurringExpenses: recurringData,
    refreshSnapshot: buildPageDataRefreshSnapshot({
      rangeExpense: dashboardData.rangeExpense,
      rangeCount: dashboardData.rangeCount,
      recurringCount: recurringData.length,
    }),
  };
}

export function buildPageDataRefreshSnapshot(input: {
  rangeExpense: number;
  rangeCount: number;
  recurringCount?: number;
}) {
  return [
    input.rangeExpense,
    input.rangeCount,
    input.recurringCount ?? 0,
  ].join(':');
}

async function loadRecurringExpenses(): Promise<RecurringExpense[]> {
  try {
    const prisma = getPrismaClient();
    const data = await prisma.recurring_expenses.findMany({
      orderBy: { created_at: 'desc' },
    });

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      amount: Number(item.amount),
      category: item.category,
      frequency: item.frequency,
      frequency_config: item.frequency_config as Record<string, any>,
      start_date: formatDateToLocal(item.start_date),
      note: undefined,
      currency: 'CNY',
      payment_method: undefined,
      is_active: item.is_active ?? true,
      last_generated_date: item.last_generated ? formatDateToLocal(item.last_generated) : undefined,
      created_at: item.created_at?.toISOString() || new Date().toISOString(),
      updated_at: item.updated_at?.toISOString() || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to load recurring expenses:', error);
    return [];
  }
}
