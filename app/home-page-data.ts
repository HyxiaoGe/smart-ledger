import { getPrismaClient } from '@/lib/clients/db';
import { parseMonthStr, formatMonth, getExtendedQuickRange, type ExtendedQuickRange } from '@/lib/utils/date';
import * as mvService from '@/lib/services/materializedViewService.server';

type MonthData = {
  income: number;
  expense: number;
  balance: number;
  trend: { name: string; expense: number }[];
  pie: { name: string; value: number }[];
  compare: { name: string; income: number; expense: number }[];
};

type RangeData = {
  expense: number;
  label: string;
  rows: any[];
};

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
  income: number;
  expense: number;
  balance: number;
  trend: { name: string; expense: number }[];
  pie: { name: string; value: number }[];
  compare: { name: string; income: number; expense: number }[];
  rangeExpense: number;
  rangeLabel: string;
  rangeRows: any[];
  top10: any[];
  recurringExpenses: RecurringExpense[];
};

export function resolveMonthLabel(monthParam?: string) {
  const baseDate = parseMonthStr(monthParam || formatMonth(new Date())) || new Date();
  return formatMonth(baseDate);
}

export async function loadPageData(
  currency: string,
  monthLabel: string,
  rangeParam: string,
  startParam?: string,
  endParam?: string
): Promise<PageData> {
  const baseDate = parseMonthStr(monthLabel) || new Date();

  // 优化：合并 rangeData 和 topData 查询（原来4次查询 → 3次查询）
  const [monthData, rangeAndTopData, recurringData] = await Promise.all([
    loadMonthData(currency, baseDate),
    loadRangeAndTopData(currency, rangeParam, monthLabel, startParam, endParam),
    loadRecurringExpenses()
  ]);

  return {
    income: monthData.income,
    expense: monthData.expense,
    balance: monthData.balance,
    trend: monthData.trend,
    pie: monthData.pie,
    compare: monthData.compare,
    rangeExpense: rangeAndTopData.expense,
    rangeLabel: rangeAndTopData.label,
    rangeRows: rangeAndTopData.rows,
    top10: rangeAndTopData.top10,
    recurringExpenses: recurringData
  };
}

/**
 * 加载月度数据（从物化视图）
 */
async function loadMonthData(currency: string, date: Date): Promise<MonthData> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [
    currentSummary,
    prevSummary,
    currentIncomeSummary,
    prevIncomeSummary,
    trend,
    pie
  ] = await Promise.all([
    mvService.getMonthlySummary(year, month, currency, 'expense'),
    mvService.getMonthlySummary(prevYear, prevMonth, currency, 'expense'),
    mvService.getMonthlySummary(year, month, currency, 'income'),
    mvService.getMonthlySummary(prevYear, prevMonth, currency, 'income'),
    mvService.getMonthlyTrend(year, month, currency),
    mvService.getCategoryPieData(year, month, currency)
  ]);

  const income = currentIncomeSummary?.totalAmount || 0;
  const expense = currentSummary?.totalAmount || 0;
  const balance = income - expense;

  const prevIncome = prevIncomeSummary?.totalAmount || 0;
  const prevExpense = prevSummary?.totalAmount || 0;

  const compare = [
    { name: '本月', income, expense },
    { name: '上月', income: prevIncome, expense: prevExpense }
  ];

  return { income, expense, balance, trend, pie, compare };
}

/**
 * 合并的范围数据和Top10查询
 * 优化：原来2次查询 → 1次查询
 */
async function loadRangeAndTopData(
  currency: string,
  rangeParam: string,
  monthLabel: string,
  startParam?: string,
  endParam?: string
): Promise<RangeData & { top10: any[] }> {
  let rStart: string;
  let rEnd: string;
  let rLabel: string;

  if (rangeParam === 'custom' && startParam && endParam) {
    rStart = startParam;
    rEnd = endParam;
    rLabel = `${startParam} - ${endParam}`;
  } else {
    // 使用扩展的日期范围函数，支持所有新的范围类型
    const extendedRange = getExtendedQuickRange(rangeParam as ExtendedQuickRange);
    rStart = extendedRange.start;
    rEnd = extendedRange.end;
    rLabel = extendedRange.label;
  }

  // 单日范围类型列表
  const singleDayRanges = ['today', 'yesterday', 'dayBeforeYesterday'];
  const isSingleDay = singleDayRanges.includes(rangeParam) || rStart === rEnd;

  // 计算结束日期
  let queryEnd = rEnd;
  if (rangeParam === 'custom') {
    const endDate = new Date(rEnd);
    endDate.setDate(endDate.getDate() + 1);
    queryEnd = endDate.toISOString().slice(0, 10);
  }

  const prisma = getPrismaClient();
  const where: any = {
    deleted_at: null,
    currency,
  };

  if (isSingleDay) {
    where.date = new Date(rStart);
  } else {
    where.date = { gte: new Date(rStart), lt: new Date(queryEnd) };
  }

  // 单次查询获取所有数据（包含 Top10 需要的字段）
  const rows = await prisma.transactions.findMany({
    where,
    select: {
      id: true,
      type: true,
      category: true,
      amount: true,
      date: true,
      note: true,
      currency: true,
      merchant: true,
      subcategory: true,
      product: true,
    },
  });

  // 计算总支出
  const expense = rows.filter((r) => r.type === 'expense').reduce((a, b) => a + Number(b.amount || 0), 0);

  // 按分类聚合数据生成 Top10
  const expenseRows = rows.filter((r) => r.type === 'expense');
  const categoryMap = new Map<string, {
    category: string;
    total: number;
    count: number;
    latestDate: string;
    merchant?: string;
    note?: string;
  }>();

  for (const transaction of expenseRows) {
    const category = transaction.category || 'other';
    const amount = Number(transaction.amount || 0);
    const dateStr = transaction.date instanceof Date
      ? transaction.date.toISOString().slice(0, 10)
      : String(transaction.date);

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        total: 0,
        count: 0,
        latestDate: dateStr,
        merchant: transaction.merchant || undefined,
        note: transaction.note || undefined
      });
    }

    const categoryData = categoryMap.get(category)!;
    categoryData.total += amount;
    categoryData.count += 1;

    if (dateStr > categoryData.latestDate) {
      categoryData.latestDate = dateStr;
      categoryData.merchant = transaction.merchant || undefined;
      categoryData.note = transaction.note || undefined;
    }
  }

  const top10 = Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(item => ({
      id: `${item.category}-agg`,
      category: item.category,
      amount: item.total,
      date: item.latestDate,
      note: `共${item.count}笔消费`,
      currency,
      merchant: undefined
    }));

  return { expense, label: rLabel, rows, top10 };
}

async function loadRecurringExpenses(): Promise<RecurringExpense[]> {
  try {
    const prisma = getPrismaClient();
    const data = await prisma.recurring_expenses.findMany({
      orderBy: { created_at: 'desc' },
    });
    // 转换 Decimal 为 number
    return data.map((item: any) => ({
      ...item,
      amount: Number(item.amount),
    })) as RecurringExpense[];
  } catch (error) {
    console.error('获取固定支出列表失败:', error);
    return [];
  }
}
