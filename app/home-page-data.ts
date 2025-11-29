import { getPrismaClient } from '@/lib/clients/db';
import { getExtendedQuickRange, type ExtendedQuickRange } from '@/lib/utils/date';

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
  // 当前范围统计
  rangeExpense: number;
  rangeIncome: number;
  rangeCount: number;
  rangeDailyAvg: number;
  rangeLabel: string;
  rangeRows: any[];

  // 环比数据（上一周期）
  prevRangeExpense: number;
  prevRangeLabel: string;

  // 动态趋势数据
  trend: { name: string; expense: number }[];

  // 分类饼图
  pie: { name: string; value: number }[];

  // Top 10 支出
  top10: any[];

  // 固定支出
  recurringExpenses: RecurringExpense[];
};

/**
 * 获取上一周期的范围类型
 */
function getPrevRangeType(rangeParam: string): ExtendedQuickRange {
  const prevMap: Record<string, ExtendedQuickRange> = {
    today: 'yesterday',
    yesterday: 'dayBeforeYesterday',
    dayBeforeYesterday: 'dayBeforeYesterday', // 没有更早的，保持不变
    thisWeek: 'lastWeek',
    lastWeek: 'weekBeforeLast',
    weekBeforeLast: 'weekBeforeLast',
    thisMonth: 'lastMonth',
    lastMonth: 'monthBeforeLast',
    monthBeforeLast: 'monthBeforeLast',
    thisQuarter: 'lastQuarter',
    lastQuarter: 'lastQuarter',
  };
  return prevMap[rangeParam] || 'yesterday';
}

/**
 * 获取范围的粒度类型
 */
function getRangeGranularity(rangeParam: string): 'day' | 'week' | 'month' | 'quarter' {
  if (['today', 'yesterday', 'dayBeforeYesterday'].includes(rangeParam)) return 'day';
  if (['thisWeek', 'lastWeek', 'weekBeforeLast'].includes(rangeParam)) return 'week';
  if (['thisMonth', 'lastMonth', 'monthBeforeLast'].includes(rangeParam)) return 'month';
  if (['thisQuarter', 'lastQuarter'].includes(rangeParam)) return 'quarter';
  return 'day'; // custom 默认为日
}

/**
 * 计算日期范围的天数
 */
function getDaysInRange(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * 生成趋势数据（根据粒度聚合）
 */
function generateTrendData(
  rows: any[],
  granularity: 'day' | 'week' | 'month' | 'quarter',
  startDate: string,
  endDate: string
): { name: string; expense: number }[] {
  const expenseRows = rows.filter((r) => r.type === 'expense');

  if (granularity === 'day') {
    // 日粒度：不显示趋势（只有一天的数据）
    return [];
  }

  if (granularity === 'week') {
    // 周粒度：显示周一~周日
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const dailyExpense = new Map<number, number>();

    for (const row of expenseRows) {
      const date = row.date instanceof Date ? row.date : new Date(row.date);
      let dayOfWeek = date.getDay(); // 0=周日, 1=周一, ...
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 转为 0=周一, 6=周日
      dailyExpense.set(dayOfWeek, (dailyExpense.get(dayOfWeek) || 0) + Number(row.amount || 0));
    }

    return dayNames.map((name, index) => ({
      name,
      expense: dailyExpense.get(index) || 0,
    }));
  }

  if (granularity === 'month') {
    // 月粒度：显示每天
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysInMonth = getDaysInRange(startDate, endDate);
    const dailyExpense = new Map<number, number>();

    for (const row of expenseRows) {
      const date = row.date instanceof Date ? row.date : new Date(row.date);
      const day = date.getDate();
      dailyExpense.set(day, (dailyExpense.get(day) || 0) + Number(row.amount || 0));
    }

    const result: { name: string; expense: number }[] = [];
    for (let d = 1; d <= Math.min(daysInMonth, 31); d++) {
      result.push({
        name: String(d),
        expense: dailyExpense.get(d) || 0,
      });
    }
    return result;
  }

  if (granularity === 'quarter') {
    // 季粒度：显示3个月
    const monthlyExpense = new Map<string, number>();

    for (const row of expenseRows) {
      const date = row.date instanceof Date ? row.date : new Date(row.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyExpense.set(monthKey, (monthlyExpense.get(monthKey) || 0) + Number(row.amount || 0));
    }

    // 获取季度的3个月
    const start = new Date(startDate);
    const months: string[] = [];
    for (let i = 0; i < 3; i++) {
      const m = new Date(start.getFullYear(), start.getMonth() + i, 1);
      months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
    }

    return months.map((monthKey) => ({
      name: monthKey.slice(5) + '月', // "01月", "02月", ...
      expense: monthlyExpense.get(monthKey) || 0,
    }));
  }

  return [];
}

export async function loadPageData(
  currency: string,
  _monthLabel: string,
  rangeParam: string,
  startParam?: string,
  endParam?: string
): Promise<PageData> {
  const [rangeData, recurringData] = await Promise.all([
    loadRangeData(currency, rangeParam, startParam, endParam),
    loadRecurringExpenses(),
  ]);

  return {
    ...rangeData,
    recurringExpenses: recurringData,
  };
}

/**
 * 加载范围数据（包含当前范围、上一周期、趋势、饼图、Top10）
 */
async function loadRangeData(
  currency: string,
  rangeParam: string,
  startParam?: string,
  endParam?: string
): Promise<Omit<PageData, 'recurringExpenses'>> {
  // 计算当前范围
  let rStart: string;
  let rEnd: string;
  let rLabel: string;

  if (rangeParam === 'custom' && startParam && endParam) {
    rStart = startParam;
    rEnd = endParam;
    rLabel = `${startParam.slice(5)} ~ ${endParam.slice(5)}`;
  } else {
    const extendedRange = getExtendedQuickRange(rangeParam as ExtendedQuickRange);
    rStart = extendedRange.start;
    rEnd = extendedRange.end;
    rLabel = extendedRange.label;
  }

  // 计算上一周期范围
  const prevRangeType = getPrevRangeType(rangeParam);
  const prevRange = getExtendedQuickRange(prevRangeType);

  // 获取粒度
  const granularity = getRangeGranularity(rangeParam);

  // 单日范围类型列表
  const singleDayRanges = ['today', 'yesterday', 'dayBeforeYesterday'];
  const isSingleDay = singleDayRanges.includes(rangeParam);

  // 计算结束日期（用于查询）
  let queryEnd = rEnd;
  if (rangeParam === 'custom') {
    const endDate = new Date(rEnd);
    endDate.setDate(endDate.getDate() + 1);
    queryEnd = endDate.toISOString().slice(0, 10);
  }

  const prisma = getPrismaClient();

  // 并行查询当前范围和上一周期的数据
  const [currentRows, prevRows] = await Promise.all([
    queryTransactions(prisma, currency, rStart, queryEnd, isSingleDay),
    queryTransactions(prisma, currency, prevRange.start, prevRange.end, singleDayRanges.includes(prevRangeType)),
  ]);

  // 计算当前范围统计
  const expenseRows = currentRows.filter((r) => r.type === 'expense');
  const incomeRows = currentRows.filter((r) => r.type === 'income');
  const rangeExpense = expenseRows.reduce((a, b) => a + Number(b.amount || 0), 0);
  const rangeIncome = incomeRows.reduce((a, b) => a + Number(b.amount || 0), 0);
  const rangeCount = expenseRows.length;
  const daysInRange = getDaysInRange(rStart, rEnd);
  const rangeDailyAvg = daysInRange > 0 ? rangeExpense / daysInRange : 0;

  // 计算上一周期统计
  const prevExpenseRows = prevRows.filter((r) => r.type === 'expense');
  const prevRangeExpense = prevExpenseRows.reduce((a, b) => a + Number(b.amount || 0), 0);

  // 生成趋势数据
  const trend = generateTrendData(currentRows, granularity, rStart, rEnd);

  // 生成分类饼图数据
  const categoryExpense = new Map<string, number>();
  for (const row of expenseRows) {
    const category = row.category || 'other';
    categoryExpense.set(category, (categoryExpense.get(category) || 0) + Number(row.amount || 0));
  }
  const pie = Array.from(categoryExpense.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 生成 Top 10
  const top10 = generateTop10(expenseRows, currency);

  return {
    rangeExpense,
    rangeIncome,
    rangeCount,
    rangeDailyAvg,
    rangeLabel: rLabel,
    rangeRows: currentRows,
    prevRangeExpense,
    prevRangeLabel: prevRange.label,
    trend,
    pie,
    top10,
  };
}

/**
 * 查询交易数据
 */
async function queryTransactions(
  prisma: ReturnType<typeof getPrismaClient>,
  currency: string,
  start: string,
  end: string,
  isSingleDay: boolean
) {
  const where: any = {
    deleted_at: null,
    currency,
  };

  if (isSingleDay) {
    where.date = new Date(start);
  } else {
    where.date = { gte: new Date(start), lt: new Date(end) };
  }

  return prisma.transactions.findMany({
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
}

/**
 * 生成 Top 10 支出
 */
function generateTop10(expenseRows: any[], currency: string) {
  const categoryMap = new Map<
    string,
    {
      category: string;
      total: number;
      count: number;
      latestDate: string;
      merchant?: string;
      note?: string;
    }
  >();

  for (const transaction of expenseRows) {
    const category = transaction.category || 'other';
    const amount = Number(transaction.amount || 0);
    const dateStr =
      transaction.date instanceof Date
        ? transaction.date.toISOString().slice(0, 10)
        : String(transaction.date);

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        total: 0,
        count: 0,
        latestDate: dateStr,
        merchant: transaction.merchant || undefined,
        note: transaction.note || undefined,
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

  return Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((item) => ({
      id: `${item.category}-agg`,
      category: item.category,
      amount: item.total,
      date: item.latestDate,
      note: `共${item.count}笔消费`,
      currency,
      merchant: undefined,
    }));
}

async function loadRecurringExpenses(): Promise<RecurringExpense[]> {
  try {
    const prisma = getPrismaClient();
    const data = await prisma.recurring_expenses.findMany({
      orderBy: { created_at: 'desc' },
    });
    return data.map((item: any) => ({
      ...item,
      amount: Number(item.amount),
    })) as RecurringExpense[];
  } catch (error) {
    console.error('获取固定支出列表失败:', error);
    return [];
  }
}
