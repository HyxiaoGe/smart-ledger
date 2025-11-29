import { getPrismaClient } from '@/lib/clients/db';
import { parseMonthStr, formatMonth, getQuickRange } from '@/lib/utils/date';

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

async function loadMonthData(currency: string, date: Date): Promise<MonthData> {
  function monthRange(d = new Date()) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const prevEnd = new Date(d.getFullYear(), d.getMonth(), 1);
    const toISO = (day: Date) => day.toISOString().slice(0, 10);
    return { start: toISO(start), end: toISO(end), prevStart: toISO(prevStart), prevEnd: toISO(prevEnd) };
  }

  const { start, end, prevStart, prevEnd } = monthRange(date);
  const prisma = getPrismaClient();

  const [rows, prevRows] = await Promise.all([
    prisma.transactions.findMany({
      where: {
        deleted_at: null,
        date: { gte: new Date(start), lt: new Date(end) },
        currency,
      },
      select: { type: true, category: true, amount: true, date: true, currency: true },
    }),
    prisma.transactions.findMany({
      where: {
        deleted_at: null,
        date: { gte: new Date(prevStart), lt: new Date(prevEnd) },
        currency,
      },
      select: { type: true, amount: true, date: true, currency: true },
    }),
  ]);

  const sum = (arr: any[], pred: (item: any) => boolean) =>
    arr.filter(pred).reduce((a, b) => a + Number(b.amount || 0), 0);

  const income = sum(rows, (r) => r.type === 'income');
  const expense = sum(rows, (r) => r.type === 'expense');
  const balance = income - expense;

  const byDay = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== 'expense') continue;
    const day = String(new Date(r.date).getDate());
    byDay.set(day, (byDay.get(day) || 0) + Number(r.amount || 0));
  }
  const trend = Array.from(byDay.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([name, expenseValue]) => ({ name, expense: expenseValue }));

  const byCat = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== 'expense') continue;
    byCat.set(r.category, (byCat.get(r.category) || 0) + Number(r.amount || 0));
  }
  const pie = Array.from(byCat.entries()).map(([name, value]) => ({ name, value }));

  const prevIncome = sum(prevRows, (r) => r.type === 'income');
  const prevExpense = sum(prevRows, (r) => r.type === 'expense');
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
    const quickRange = getQuickRange(rangeParam as any, monthLabel);
    rStart = quickRange.start;
    rEnd = quickRange.end;
    rLabel = quickRange.label;
  }

  const isSingleDay = rangeParam === 'today' || rangeParam === 'yesterday' || rStart === rEnd;

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
