// 首页：汇总 + 图表 + AI 分析（中文注释）
// 移除未使用的 SummaryCard 组件导入
import { ChartSummary } from './components/ChartSummary';
import { AiAnalyzeButton } from './components/AiAnalyze';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonthPicker } from '@/components/MonthPicker';
import { parseMonthStr, formatMonth, shiftMonth } from '@/lib/date';

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const prevStart = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const prevEnd = new Date(date.getFullYear(), date.getMonth(), 1);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toISO(start), end: toISO(end), prevStart: toISO(prevStart), prevEnd: toISO(prevEnd) };
}

function symbolOf(code: string) {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return found?.symbol ?? '';
}

async function loadMonthData(currency: string, date: Date) {
  const { start, end, prevStart, prevEnd } = monthRange(date);
  // 按指定币种统计（避免跨币种误差）
  const cur = await supabase
    .from('transactions')
    .select('type, category, amount, date, currency')
    .gte('date', start)
    .lt('date', end)
    .eq('currency', currency);

  const prev = await supabase
    .from('transactions')
    .select('type, amount, date, currency')
    .gte('date', prevStart)
    .lt('date', prevEnd)
    .eq('currency', currency);

  const rows = cur.data || [];
  const prevRows = prev.data || [];

  const sum = (arr: any[], pred: (r: any) => boolean) => arr.filter(pred).reduce((a, b) => a + Number(b.amount || 0), 0);

  const income = sum(rows, (r) => r.type === 'income');
  const expense = sum(rows, (r) => r.type === 'expense');
  const balance = income - expense;

  // 趋势：按日聚合支出
  const byDay = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== 'expense') continue;
    const day = String(new Date(r.date).getDate());
    byDay.set(day, (byDay.get(day) || 0) + Number(r.amount || 0));
  }
  const trend = Array.from(byDay.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([name, expense]) => ({ name, expense }));

  // 类别占比（支出）
  const byCat = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== 'expense') continue;
    byCat.set(r.category, (byCat.get(r.category) || 0) + Number(r.amount || 0));
  }
  const pie = Array.from(byCat.entries()).map(([name, value]) => ({ name, value }));

  // 收支对比（本月 vs 上月）
  const prevIncome = sum(prevRows, (r) => r.type === 'income');
  const prevExpense = sum(prevRows, (r) => r.type === 'expense');
  const compare = [
    { name: '本月', income, expense },
    { name: '上月', income: prevIncome, expense: prevExpense }
  ];

  return { income, expense, balance, trend, pie, compare };
}

export default async function HomePage({ searchParams }: { searchParams?: { currency?: string; month?: string } }) {
  const currency = SUPPORTED_CURRENCIES.some((c) => c.code === (searchParams?.currency || ''))
    ? (searchParams!.currency as string)
    : DEFAULT_CURRENCY;
  const monthParam = searchParams?.month;
  const baseDate = parseMonthStr(monthParam || formatMonth(new Date())) || new Date();
  const monthLabel = formatMonth(baseDate);
  const prev = formatMonth(shiftMonth(baseDate, -1));
  const next = formatMonth(shiftMonth(baseDate, 1));
  const { income, expense, balance, trend, pie, compare } = await loadMonthData(currency, baseDate);
  const sym = symbolOf(currency);
  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center justify-between">
        <div className="flex gap-3">
          <Link href="/add"><Button>添加账单</Button></Link>
          <Link href="/records"><Button variant="secondary">查看账单</Button></Link>
          <AiAnalyzeButton currency={currency} month={monthLabel} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <span className="text-sm text-muted-foreground">币种</span>
            {SUPPORTED_CURRENCIES.map((c) => (
              <Link key={c.code} href={`/?currency=${c.code}&month=${monthLabel}`}>
                <Button variant={currency === c.code ? 'default' : 'secondary'}>{c.code}</Button>
              </Link>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">月份</span>
            <Link href={`/?currency=${currency}&month=${prev}`}><Button variant="secondary">上月</Button></Link>
            <Link href={`/?currency=${currency}&month=${formatMonth(new Date())}`}><Button variant="secondary">当月</Button></Link>
            <Link href={`/?currency=${currency}&month=${next}`}><Button variant="secondary">下月</Button></Link>
            <MonthPicker />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">本月支出</CardTitle></CardHeader>
          <CardContent className="pt-0 text-2xl font-bold">{`${sym}${expense.toFixed(2)}`}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">本月收入</CardTitle></CardHeader>
          <CardContent className="pt-0 text-2xl font-bold">{`${sym}${income.toFixed(2)}`}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">本月结余</CardTitle></CardHeader>
          <CardContent className="pt-0 text-2xl font-bold">{`${sym}${balance.toFixed(2)}`}</CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">图表概览（{monthLabel}，{currency}）</h2>
        <ChartSummary trend={trend} pie={pie} compare={compare} currency={currency} />
      </section>
    </div>
  );
}
