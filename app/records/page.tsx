// 账单列表页（中文注释）
import { supabase } from '@/lib/supabaseClient';
import { TransactionList } from '@/components/TransactionList';
import { parseMonthStr, formatMonth, shiftMonth, getQuickRange } from '@/lib/date';
export const revalidate = 0;
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MonthPicker } from '@/components/MonthPicker';
import { RangePicker } from '@/components/RangePicker';
import { MonthlyExpenseSummary } from '@/components/MonthlyExpenseSummary';

async function fetchTransactions(month?: string) {
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

export default async function RecordsPage({ searchParams }: { searchParams?: { month?: string; range?: string } }) {
  const month = searchParams?.month;
  const range = (searchParams?.range as string) || 'today';
  const { data: rows, monthLabel } = await fetchTransactions(month);
  const cur = parseMonthStr(month || formatMonth(new Date())) || new Date();
  const prev = formatMonth(shiftMonth(cur, -1));
  const next = formatMonth(shiftMonth(cur, 1));
  const startMonth = new Date(cur.getFullYear(), cur.getMonth(), 1).toISOString().slice(0, 10);
  const endMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1).toISOString().slice(0, 10);
  const qr = getQuickRange(range as any, monthLabel);
  const start = range === 'month' ? startMonth : qr.start;
  const end = range === 'month' ? endMonth : qr.end;
  const rangeLabel = range === 'month' ? monthLabel : qr.label;
  return (
    <div className="grid">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">账单列表（{rangeLabel}）</h1>
        <div className="flex items-center gap-2">
          <Link href={`/records?month=${prev}`}><Button variant="secondary">上月</Button></Link>
          <Link href={`/records?month=${formatMonth(new Date())}`}><Button variant="secondary">当月</Button></Link>
          <Link href={`/records?month=${next}`}><Button variant="secondary">下月</Button></Link>
          <MonthPicker />
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
        <TransactionList initialRows={rows as any} start={start} end={end} />
      )}
    </div>
  );
}
