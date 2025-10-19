import { supabase } from '@/lib/supabaseClient';
import { TransactionGroupedList } from '@/components/TransactionGroupedList';
import { parseMonthStr, formatMonth, shiftMonth, getQuickRange } from '@/lib/date';
export const revalidate = 0;
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RangePicker } from '@/components/RangePicker';
import { MonthlyExpenseSummary } from '@/components/MonthlyExpenseSummary';

async function fetchTransactions(month?: string, range?: string, startDate?: string, endDate?: string) {
  // 根据范围参数筛选数据
  if (range && range !== 'month') {
    let dateRange;

    if (range === 'custom' && startDate && endDate) {
      // 自定义日期范围
      dateRange = { start: startDate, end: endDate, label: `${startDate} - ${endDate}` };
    } else {
      // 快捷选项
      dateRange = getQuickRange(range as any, month);
    }

    let query = supabase
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

    const { data, error } = await query
      .order('date', { ascending: false })
      .limit(50);
    if (error) throw error;
    return { data: data ?? [], monthLabel: dateRange.label } as const;
  }
  
  // 可选的月份筛选（YYYY-MM），默认当前月；不筛选则返回全部
  const d = parseMonthStr(month || formatMonth(new Date()));
  if (!d) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .eq('type', 'expense')
      .order('date', { ascending: false })
      .limit(50);
    if (error) throw error;
    return { data: data ?? [], monthLabel: '全部' } as const;
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .is('deleted_at', null)
    .eq('type', 'expense')
    .gte('date', start)
    .lt('date', end)
    .order('date', { ascending: false })
    .limit(50);
  if (error) throw error;
  return { data: data ?? [], monthLabel: formatMonth(d) } as const;
}

export default async function RecordsPage({ searchParams }: { searchParams?: { month?: string; range?: string; start?: string; end?: string } }) {
  const month = searchParams?.month;
  const range = (searchParams?.range as string) || 'today';
  const start = searchParams?.start;
  const end = searchParams?.end;
  const { data: rows, monthLabel } = await fetchTransactions(month, range, start, end);
  let queryStart, queryEnd, rangeLabel;
  if (range === 'month') {
    // 当月范围：1号到今天
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    queryStart = monthStart.toISOString().slice(0, 10);
    queryEnd = today.toISOString().slice(0, 10);
    rangeLabel = monthLabel;
  } else if (range === 'custom' && searchParams?.start && searchParams?.end) {
    queryStart = searchParams.start;
    queryEnd = searchParams.end;
    rangeLabel = `${queryStart} - ${queryEnd}`;
  } else {
    const qr = getQuickRange(range as any, month);
    queryStart = qr.start;
    queryEnd = qr.end;
    rangeLabel = qr.label;
  }
  return (
    <div className="grid">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">账单列表（{rangeLabel}）</h1>
        <div className="flex items-center">
          <RangePicker />
        </div>
      </div>
      {range === 'month' ? (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          {(() => {
            // 在服务端对本月数据进行聚合（仅支出）
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
            return <MonthlyExpenseSummary items={items} currency={'CNY'} />;
          })()}
        </div>
      ) : (
        <div className="mt-4">
          <TransactionGroupedList
            initialTransactions={rows as any}
          />
        </div>
      )}
    </div>
  );
}
