import { supabase } from '@/lib/supabaseClient';
import { TransactionGroupedList } from '@/components/TransactionGroupedList';
import { parseMonthStr, formatMonth, shiftMonth, getQuickRange } from '@/lib/date';
export const revalidate = 0;
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RangePicker } from '@/components/RangePicker';
import { MonthlyExpenseSummary } from '@/components/MonthlyExpenseSummary';
import { CategoryStatistics } from '@/components/CategoryStatistics';

async function fetchTransactions(month?: string, range?: string, startDate?: string, endDate?: string) {
  let dateRange;
  let query;

  // 根据范围参数筛选数据
  if (range && range !== 'month') {
    if (range === 'custom' && startDate && endDate) {
      // 自定义日期范围
      dateRange = { start: startDate, end: endDate, label: `${startDate} - ${endDate}` };
    } else {
      // 快捷选项
      dateRange = getQuickRange(range as any, month);
    }

    query = supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .eq('type', 'expense');

    // 对于单日查询，使用等值比较；对于多日查询，使用范围比较
    if ((range === 'today' || range === 'yesterday') && dateRange.start === dateRange.end) {
      query = query.eq('date', dateRange.start);
    } else {
      if (range === 'custom') {
        // 自定义日期范围：需要包含结束日期，所以加1天
        const endDate = new Date(dateRange.end);
        endDate.setDate(endDate.getDate() + 1);
        const endDateStr = endDate.toISOString().slice(0, 10);
        query = query.gte('date', dateRange.start).lt('date', endDateStr);
      } else {
        // 快捷选项：getQuickRange 的 end 已经是下一天，直接使用
        query = query.gte('date', dateRange.start).lt('date', dateRange.end);
      }
    }
  } else {
    // 处理月份查询或默认情况
    let d;
    if (range === 'month') {
      // 当选择"当月"时，使用当前月份
      d = new Date();
    } else {
      // 其他情况使用month参数
      d = parseMonthStr(month || formatMonth(new Date()));
    }

    if (!d) {
      // 如果无法解析月份，返回全部数据
      query = supabase
        .from('transactions')
        .select('*')
        .is('deleted_at', null)
        .eq('type', 'expense')
        .order('date', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return { data: data ?? [], monthLabel: '全部' } as const;
    }

    // 月份查询：从1号到月底
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
    dateRange = { start, end, label: formatMonth(d) };

    query = supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .eq('type', 'expense')
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return { data: data ?? [], monthLabel: dateRange.label } as const;
}

export default async function RecordsPage({ searchParams }: { searchParams?: { month?: string; range?: string; start?: string; end?: string } }) {
  const month = searchParams?.month;
  const range = (searchParams?.range as string) || 'today';
  const start = searchParams?.start;
  const end = searchParams?.end;
  const { data: rows, monthLabel } = await fetchTransactions(month, range, start, end);

  // 获取昨日数据用于趋势分析（仅在单日查询时）
  let yesterdayData: any[] = [];
  if (range === 'today' || range === 'yesterday') {
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

    yesterdayData = data || [];
  }

  // 获取当月累计数据用于月度预算进度（始终基于当月数据）
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

  // 计算当月累计数据
  const monthDaily = new Map<string, { total: number; count: number }>();
  for (const r of monthData || []) {
    const key = r.date;
    const cur = monthDaily.get(key) || { total: 0, count: 0 };
    monthDaily.set(key, { total: cur.total + Number(r.amount || 0), count: cur.count + 1 });
  }
  const monthItems = Array.from(monthDaily.entries())
    .map(([date, v]) => ({ date, total: v.total, count: v.count }));

  const monthTotalAmount = monthItems.reduce((sum, item) => sum + item.total, 0);
  const monthTotalCount = monthItems.reduce((sum, item) => sum + item.count, 0);
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
        // 在服务端对当前查询范围数据进行聚合（仅支出）
        const daily = new Map<string, { total: number; count: number }>();
        for (const r of rows as any[]) {
          if (r.type !== 'expense') continue;
          const key = r.date;
          const cur = daily.get(key) || { total: 0, count: 0 };
          daily.set(key, { total: cur.total + Number(r.amount || 0), count: cur.count + 1 });
        }
        const items = Array.from(daily.entries())
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map(([date, v]) => ({ date, total: v.total, count: v.count }));

        // 过滤出支出交易记录
        const expenseTransactions = (rows as any[]).filter(r => r.type === 'expense');

        return (
          <>
            <MonthlyExpenseSummary
              items={items}
              transactions={expenseTransactions}
              yesterdayTransactions={yesterdayData}
              monthTotalAmount={monthTotalAmount}
              monthTotalCount={monthTotalCount}
              currency={'CNY'}
              dateRange={monthLabel}
              rangeType={range}
            />

            {/* 分类统计组件 */}
            <CategoryStatistics
              transactions={expenseTransactions}
              currency={'CNY'}
            />
          </>
        );
      })()}

      {/* 交易明细列表 */}
      <div>
        <TransactionGroupedList
          initialTransactions={rows as any}
        />
      </div>
    </div>
  );
}
