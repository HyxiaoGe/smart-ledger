import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import { CacheDecorator } from '@/lib/infrastructure/cache';
import type { ICache } from '@/lib/infrastructure/cache';
import { formatDateToLocal, parseLocalDate } from '@/lib/utils/date';
import type { Currency } from '@/types/domain/transaction';
import { resolveTransactionRange } from './TransactionRange';

export interface TransactionDashboardResult {
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
  top10: Array<{
    id: string;
    category: string;
    amount: number;
    date?: string;
    note?: string;
    currency: string;
    merchant?: string;
    subcategory?: string;
    product?: string;
  }>;
  calendarData: { date: string; amount: number; count: number }[];
  calendarYear: number;
  calendarMonth: number;
}

export class TransactionDashboardService {
  private cacheDecorator: CacheDecorator;

  constructor(
    private readonly repository: ITransactionRepository,
    cache: ICache
  ) {
    this.cacheDecorator = new CacheDecorator(cache, {
      ttl: 60 * 1000,
      tags: ['transactions', 'dashboard'],
      debug: false,
    });
  }

  async getDashboardData(params: {
    currency: string;
    month?: string;
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionDashboardResult> {
    const resolved = resolveTransactionRange(params);
    if (!resolved) {
      const now = new Date();
      return {
        rangeExpense: 0,
        rangeIncome: 0,
        rangeCount: 0,
        rangeDailyAvg: 0,
        rangeLabel: '无效范围',
        rangeRows: [],
        isSingleDay: false,
        isToday: false,
        prevRangeExpense: 0,
        prevRangeLabel: '无数据',
        trend: [],
        pie: [],
        top10: [],
        calendarData: [],
        calendarYear: now.getFullYear(),
        calendarMonth: now.getMonth() + 1,
      };
    }

    const cacheKey = [
      'dashboard',
      params.currency,
      resolved.key,
      resolved.displayStart,
      resolved.displayEnd,
      resolved.queryEnd,
    ].join(':');

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        const calendarMonth = resolveCalendarMonth(resolved);
        const [currentRows, prevRows, calendarRows] = await Promise.all([
          this.loadTransactions(params.currency, resolved.queryStart, resolved.queryEnd),
          this.loadTransactions(
            params.currency,
            resolved.previousRange.queryStart,
            resolved.previousRange.queryEnd
          ),
          this.loadTransactions(
            params.currency,
            calendarMonth.start,
            calendarMonth.end,
            'expense'
          ),
        ]);

        const expenseRows = currentRows.filter((row) => row.type === 'expense');
        const incomeRows = currentRows.filter((row) => row.type === 'income');
        const prevExpenseRows = prevRows.filter((row) => row.type === 'expense');

        const rangeExpense = expenseRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const rangeIncome = incomeRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const rangeCount = expenseRows.length;
        const rangeDailyAvg =
          getDaysInRange(resolved.displayStart, resolved.displayEnd) > 0
            ? rangeExpense / getDaysInRange(resolved.displayStart, resolved.displayEnd)
            : 0;
        const todayStr = formatDateToLocal(new Date());

        return {
          rangeExpense,
          rangeIncome,
          rangeCount,
          rangeDailyAvg,
          rangeLabel: resolved.label,
          rangeRows: currentRows,
          isSingleDay: resolved.isSingleDay,
          isToday: resolved.isSingleDay && resolved.displayStart === todayStr,
          prevRangeExpense: prevExpenseRows.reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0
          ),
          prevRangeLabel: resolved.previousRange.label,
          trend: generateTrendData(
            currentRows,
            resolved.granularity,
            resolved.displayStart,
            resolved.displayEnd
          ),
          pie: generatePie(expenseRows),
          top10: generateTop10(expenseRows, params.currency, resolved.isSingleDay),
          calendarData: generateCalendarData(calendarRows),
          calendarYear: calendarMonth.year,
          calendarMonth: calendarMonth.month,
        };
      },
      { ttl: 60 * 1000 }
    );
  }

  clearCache(): void {
    this.cacheDecorator.invalidateByTag('dashboard');
  }

  private async loadTransactions(
    currency: string,
    startDate: string,
    endDate: string,
    type?: 'expense' | 'income'
  ) {
    const result = await this.repository.findMany(
      {
        currency: currency as Currency,
        startDate,
        endDate,
        type,
      },
      { field: 'date', order: 'desc' }
    );

    return result.data;
  }
}

function getDaysInRange(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function generateTrendData(
  rows: any[],
  granularity: 'day' | 'week' | 'month' | 'quarter',
  startDate: string,
  endDate: string
): { name: string; expense: number }[] {
  const expenseRows = rows.filter((row) => row.type === 'expense');

  if (granularity === 'day') return [];

  if (granularity === 'week') {
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const dailyExpense = new Map<number, number>();

    for (const row of expenseRows) {
      const date = new Date(row.date);
      let dayOfWeek = date.getDay();
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      dailyExpense.set(dayOfWeek, (dailyExpense.get(dayOfWeek) || 0) + Number(row.amount || 0));
    }

    return dayNames.map((name, index) => ({
      name,
      expense: dailyExpense.get(index) || 0,
    }));
  }

  if (granularity === 'month') {
    const dailyExpense = new Map<number, number>();
    const daysInMonth = getDaysInRange(startDate, endDate);

    for (const row of expenseRows) {
      const date = new Date(row.date);
      const day = date.getDate();
      dailyExpense.set(day, (dailyExpense.get(day) || 0) + Number(row.amount || 0));
    }

    return Array.from({ length: Math.min(daysInMonth, 31) }, (_, index) => ({
      name: String(index + 1),
      expense: dailyExpense.get(index + 1) || 0,
    }));
  }

  const monthlyExpense = new Map<string, number>();

  for (const row of expenseRows) {
    const date = new Date(row.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyExpense.set(monthKey, (monthlyExpense.get(monthKey) || 0) + Number(row.amount || 0));
  }

  const start = parseLocalDate(startDate) ?? new Date(startDate);
  const months = Array.from({ length: 3 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });

  return months.map((monthKey) => ({
    name: `${monthKey.slice(5)}月`,
    expense: monthlyExpense.get(monthKey) || 0,
  }));
}

function generatePie(expenseRows: any[]) {
  const categoryExpense = new Map<string, number>();

  for (const row of expenseRows) {
    const category = row.category || 'other';
    categoryExpense.set(category, (categoryExpense.get(category) || 0) + Number(row.amount || 0));
  }

  return Array.from(categoryExpense.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function generateTop10(expenseRows: any[], currency: string, isSingleDay: boolean) {
  if (isSingleDay) {
    return expenseRows
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 10)
      .map((transaction) => ({
        id: transaction.id,
        category: transaction.category || 'other',
        amount: Number(transaction.amount || 0),
        date:
          transaction.date instanceof Date
            ? formatDateToLocal(transaction.date)
            : String(transaction.date),
        note: transaction.note || undefined,
        currency,
        merchant: transaction.merchant || undefined,
        subcategory: transaction.subcategory || undefined,
        product: transaction.product || undefined,
      }));
  }

  const categoryMap = new Map<string, { category: string; total: number; count: number }>();

  for (const transaction of expenseRows) {
    const category = transaction.category || 'other';
    const amount = Number(transaction.amount || 0);
    const current = categoryMap.get(category) || { category, total: 0, count: 0 };
    categoryMap.set(category, {
      category,
      total: current.total + amount,
      count: current.count + 1,
    });
  }

  return Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((item) => ({
      id: `${item.category}-agg`,
      category: item.category,
      amount: item.total,
      note: `共${item.count}笔消费`,
      currency,
    }));
}

function resolveCalendarMonth(resolved: {
  key: string;
  displayStart: string;
  displayEnd: string;
  queryStart: string;
}) {
  if (['thisMonth', 'lastMonth', 'monthBeforeLast', 'month'].includes(resolved.key)) {
    const parsed = parseLocalDate(resolved.queryStart);
    if (parsed) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        start: formatDateToLocal(new Date(parsed.getFullYear(), parsed.getMonth(), 1)),
        end: formatDateToLocal(new Date(parsed.getFullYear(), parsed.getMonth() + 1, 1)),
      };
    }
  }

  if (isFullMonthRange(resolved.displayStart, resolved.displayEnd)) {
    const parsed = parseLocalDate(resolved.displayStart);
    if (parsed) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        start: formatDateToLocal(new Date(parsed.getFullYear(), parsed.getMonth(), 1)),
        end: formatDateToLocal(new Date(parsed.getFullYear(), parsed.getMonth() + 1, 1)),
      };
    }
  }

  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    start: formatDateToLocal(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: formatDateToLocal(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
  };
}

function generateCalendarData(rows: any[]) {
  const dailyMap = new Map<string, { amount: number; count: number }>();

  for (const row of rows) {
    const date = formatDateToLocal(new Date(row.date));
    const current = dailyMap.get(date) || { amount: 0, count: 0 };
    dailyMap.set(date, {
      amount: current.amount + Number(row.amount || 0),
      count: current.count + 1,
    });
  }

  return Array.from(dailyMap.entries()).map(([date, value]) => ({
    date,
    amount: value.amount,
    count: value.count,
  }));
}

function isFullMonthRange(startStr: string, endStr: string): boolean {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  if (!start || !end) return false;
  if (start.getFullYear() !== end.getFullYear()) return false;
  if (start.getMonth() !== end.getMonth()) return false;
  if (start.getDate() !== 1) return false;
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  return end.getDate() === lastDay;
}
