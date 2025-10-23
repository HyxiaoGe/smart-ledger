import { unstable_cache } from 'next/cache';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { parseMonthStr, formatMonth, getQuickRange } from '@/lib/date';
import { partitionExpenseTransactions } from '@/lib/records';
export const revalidate = 60;
import { RangePicker } from '@/components/RangePicker';
import { CollapsibleTransactionList } from '@/components/CollapsibleTransactionList';
import { SkeletonBlock, SkeletonGrid } from '@/components/Skeletons';

const SummaryModule = dynamic(
  () => import('@/components/MonthlyExpenseSummary').then((mod) => mod.MonthlyExpenseSummary),
  {
    loading: () => (
      <SkeletonGrid
        count={2}
        className="grid gap-4 md:grid-cols-2"
        itemClassName="h-60 rounded-xl"
      />
    )
  }
);

const CategoryModule = dynamic(
  () => import('@/components/CategoryStatistics').then((mod) => mod.CategoryStatistics),
  {
    loading: () => <SkeletonBlock className="h-96 rounded-xl" />
  }
);

type DateRange = { start: string; end: string; label: string };

async function fetchTransactions(month?: string, range?: string, startDate?: string, endDate?: string) {
  const cacheKey = [
    'records:transactions',
    month ?? 'all',
    range ?? 'today',
    startDate ?? 'none',
    endDate ?? 'none'
  ];

  const getCached = unstable_cache(
    async () => {
      let dateRange: DateRange | undefined;
      let query;

      if (range && range !== 'month') {
        if (range === 'custom' && startDate && endDate) {
          dateRange = { start: startDate, end: endDate, label: `${startDate} - ${endDate}` };
        } else {
          dateRange = getQuickRange(range as any, month);
        }

        query = supabase
          .from('transactions')
          .select('*')
          .is('deleted_at', null)
          .eq('type', 'expense');

        if ((range === 'today' || range === 'yesterday') && dateRange.start === dateRange.end) {
          query = query.eq('date', dateRange.start);
        } else if (range === 'custom') {
          const end = new Date(dateRange.end);
          end.setDate(end.getDate() + 1);
          const endDateStr = end.toISOString().slice(0, 10);
          query = query.gte('date', dateRange.start).lt('date', endDateStr);
        } else if (dateRange) {
          query = query.gte('date', dateRange.start).lt('date', dateRange.end);
        }
      } else {
        let parsedMonth: Date | null = null;
        if (range === 'month') {
          parsedMonth = new Date();
        } else {
          parsedMonth = parseMonthStr(month || formatMonth(new Date()));
        }

        if (!parsedMonth) {
          query = supabase
            .from('transactions')
            .select('*')
            .is('deleted_at', null)
            .eq('type', 'expense')
            .order('date', { ascending: false });
          const { data, error } = await query;
          if (error) throw error;
          return { rows: data ?? [], monthLabel: '全部' } as const;
        }

        const start = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1).toISOString().slice(0, 10);
        const end = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 1).toISOString().slice(0, 10);
        dateRange = { start, end, label: formatMonth(parsedMonth) };

        query = supabase
          .from('transactions')
          .select('*')
          .is('deleted_at', null)
          .eq('type', 'expense')
          .gte('date', start)
          .lt('date', end)
          .order('date', { ascending: false });
      }

      const { data, error } = await query!;
      if (error) throw error;
      return { rows: data ?? [], monthLabel: dateRange?.label ?? '全部' } as const;
    },
    cacheKey,
    { revalidate: 60, tags: ['transactions'] }
  );

  return getCached();
}

async function fetchYesterdayTransactions(range?: string) {
  const cacheKey = ['records:yesterday', range ?? 'none'];
  const getCached = unstable_cache(
    async () => {
      if (range !== 'today' && range !== 'yesterday') {
        return [];
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .is('deleted_at', null)
        .eq('type', 'expense')
        .eq('date', yesterdayStr)
        .order('date', { ascending: false });

      return data || [];
    },
    cacheKey,
    { revalidate: 60, tags: ['transactions'] }
  );
  return getCached();
}

async function fetchCurrentMonthSummary() {
  const getCached = unstable_cache(
    async () => {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10);

      const { data: monthData } = await supabase
        .from('transactions')
        .select('*')
        .is('deleted_at', null)
        .eq('type', 'expense')
        .gte('date', monthStart)
        .lt('date', monthEnd)
        .order('date', { ascending: false });

      const monthDaily = new Map<string, { total: number; count: number }>();
      for (const r of monthData || []) {
        const key = r.date;
        const cur = monthDaily.get(key) || { total: 0, count: 0 };
        monthDaily.set(key, { total: cur.total + Number(r.amount || 0), count: cur.count + 1 });
      }

      const monthItems = Array.from(monthDaily.entries()).map(([date, v]) => ({ date, total: v.total, count: v.count }));
      const monthTotalAmount = monthItems.reduce((sum, item) => sum + item.total, 0);
      const monthTotalCount = monthItems.reduce((sum, item) => sum + item.count, 0);

      return { monthItems, monthTotalAmount, monthTotalCount };
    },
    ['records:month-summary'],
    { revalidate: 60, tags: ['transactions'] }
  );

  return getCached();
}

export default async function RecordsPage({ searchParams }: { searchParams?: { month?: string; range?: string; start?: string; end?: string } }) {
  const month = searchParams?.month;
  const range = (searchParams?.range as string) || 'today';
  const start = searchParams?.start;
  const end = searchParams?.end;

  const [mainResult, yesterdayData, monthSummary] = await Promise.all([
    fetchTransactions(month, range, start, end).catch(() => ({ rows: [], monthLabel: '全部' })),
    fetchYesterdayTransactions(range).catch(() => []),
    fetchCurrentMonthSummary().catch(() => ({
      monthItems: [],
      monthTotalAmount: 0,
      monthTotalCount: 0
    }))
  ]);

  const rows = mainResult.rows;
  const monthLabel = mainResult.monthLabel;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">账单列表（{monthLabel}）</h1>
        <div className="flex items-center">
          <RangePicker />
        </div>
      </div>

      {/* 统计面板 - 所有范围都显示 */}
      {(() => {
        const { dailyItems: items, expenseTransactions } = partitionExpenseTransactions(rows as any[]);

        return (
          <>
            <SummaryModule
              items={items}
              transactions={expenseTransactions}
              yesterdayTransactions={yesterdayData}
              monthTotalAmount={monthSummary.monthTotalAmount}
              monthTotalCount={monthSummary.monthTotalCount}
              currency={'CNY'}
              dateRange={monthLabel}
              rangeType={range}
            />

            {/* 分类统计组件 */}
            <CategoryModule
              transactions={expenseTransactions}
              currency={'CNY'}
            />
          </>
        );
      })()}

      {/* 交易明细列表 - 带收纳功能 */}
      <CollapsibleTransactionList
        initialTransactions={rows as any}
        totalCount={rows.length}
      />
    </div>
  );
}
