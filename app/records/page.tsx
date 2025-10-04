// 账单列表页（中文注释）
import { supabase } from '@/lib/supabaseClient';
import { TransactionList } from '@/components/TransactionList';
import { parseMonthStr, formatMonth, shiftMonth } from '@/lib/date';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MonthPicker } from '@/components/MonthPicker';

async function fetchTransactions(month?: string) {
  // 可选的月份筛选（YYYY-MM），默认当前月；不筛选则返回全部
  const d = parseMonthStr(month || formatMonth(new Date()));
  if (!d) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
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
    .gte('date', start)
    .lt('date', end)
    .order('date', { ascending: false })
    .limit(50);
  if (error) throw error;
  return { data: data ?? [], monthLabel: formatMonth(d) } as const;
}

export default async function RecordsPage({ searchParams }: { searchParams?: { month?: string } }) {
  const month = searchParams?.month;
  const { data: rows, monthLabel } = await fetchTransactions(month);
  const cur = parseMonthStr(month || formatMonth(new Date())) || new Date();
  const prev = formatMonth(shiftMonth(cur, -1));
  const next = formatMonth(shiftMonth(cur, 1));
  const start = new Date(cur.getFullYear(), cur.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 1).toISOString().slice(0, 10);
  return (
    <div className="grid">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">账单列表（{monthLabel}）</h1>
        <div className="flex items-center gap-2">
          <Link href={`/records?month=${prev}`}><Button variant="secondary">上月</Button></Link>
          <Link href={`/records?month=${formatMonth(new Date())}`}><Button variant="secondary">当月</Button></Link>
          <Link href={`/records?month=${next}`}><Button variant="secondary">下月</Button></Link>
          <MonthPicker />
        </div>
      </div>
      <TransactionList initialRows={rows as any} start={start} end={end} />
    </div>
  );
}
