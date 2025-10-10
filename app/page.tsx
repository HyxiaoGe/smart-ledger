// 首页：汇总 + 图表 + AI 分析（中文注释）
// 移除未使用的 SummaryCard 组件导入
import { ChartSummary } from './components/ChartSummary';
import { AiAnalyzeButton } from './components/AiAnalyze';
import Link from 'next/link';
export const revalidate = 0;
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabaseClient';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { MonthPicker } from '@/components/MonthPicker';
import { EnhancedRangePicker } from '@/components/EnhancedRangePicker';
import { CurrencySelect } from '@/components/CurrencySelect';
import { parseMonthStr, formatMonth, shiftMonth, getQuickRange } from '@/lib/date';
import { TopExpenses } from '@/components/TopExpenses';

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
    .is('deleted_at', null)
    .gte('date', start)
    .lt('date', end)
    .eq('currency', currency);

  const prev = await supabase
    .from('transactions')
    .select('type, amount, date, currency')
    .is('deleted_at', null)
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

export default async function HomePage({ searchParams }: { searchParams?: { currency?: string; month?: string; range?: string; start?: string; end?: string } }) {
  const currency = SUPPORTED_CURRENCIES.some((c) => c.code === (searchParams?.currency || ''))
    ? (searchParams!.currency as string)
    : DEFAULT_CURRENCY;
  const rangeParam = (searchParams?.range as string) || 'today';
  const monthParam = searchParams?.month;
  const startParam = searchParams?.start;
  const endParam = searchParams?.end;
  const baseDate = parseMonthStr(monthParam || formatMonth(new Date())) || new Date();
  const monthLabel = formatMonth(baseDate);
  const prev = formatMonth(shiftMonth(baseDate, -1));
  const next = formatMonth(shiftMonth(baseDate, 1));
  const { income, expense, balance, trend, pie, compare } = await loadMonthData(currency, baseDate);
  const sym = symbolOf(currency);

  // 日/快捷范围汇总 - 支持自定义日期范围
  let rStart, rEnd, rLabel;
  if (rangeParam === 'custom' && startParam && endParam) {
    // 自定义日期范围
    rStart = startParam;
    rEnd = endParam;
    rLabel = `${startParam} - ${endParam}`;
  } else {
    // 快捷选项
    const quickRange = getQuickRange(rangeParam as any, monthLabel);
    rStart = quickRange.start;
    rEnd = quickRange.end;
    rLabel = quickRange.label;
  }
  // 处理日期范围查询：如果是单日查询，使用等值比较；如果是多日查询，使用范围比较并包含结束日期
  let query = supabase
    .from('transactions')
    .select('type, category, amount, date, currency')
    .is('deleted_at', null)
    .eq('currency', currency);

  // 判断是否为单日查询
  const isSingleDay = (rangeParam === 'today' || rangeParam === 'yesterday') || (rStart === rEnd);

  if (isSingleDay) {
    query = query.eq('date', rStart);
  } else {
    if (rangeParam === 'custom') {
      // 自定义日期范围：需要包含结束日期，所以加1天
      const endDate = new Date(rEnd);
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = endDate.toISOString().slice(0, 10);
      query = query.gte('date', rStart).lt('date', endDateStr);
    } else {
      // 快捷选项：getQuickRange 的 end 已经是下一天，直接使用
      query = query.gte('date', rStart).lt('date', rEnd);
    }
  }

  const curRange = await query;
  const rRows = curRange.data || [];
  const rSum = (arr: any[], pred: (r: any) => boolean) => arr.filter(pred).reduce((a, b) => a + Number(b.amount || 0), 0);
  const rincome = rSum(rRows, (r) => r.type === 'income');
  const rexpense = rSum(rRows, (r) => r.type === 'expense');
  const rbalance = rincome - rexpense;
  const topQ = await supabase
    .from('transactions')
    .select('id, type, category, amount, date, note, currency')
    .is('deleted_at', null)
    .gte('date', rStart)
    .lt('date', rEnd)
    .eq('currency', currency)
    .eq('type', 'expense')
    .order('amount', { ascending: false })
    .limit(10);
  const top10 = (topQ.data || []) as any[];
  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center justify-between">
        <div className="flex gap-3">
          <Link href="/add"><Button>添加账单</Button></Link>
          <Link href="/records"><Button variant="secondary">查看账单</Button></Link>
          <AiAnalyzeButton currency={currency} month={monthLabel} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">币种</span>
            <CurrencySelect value={currency} month={monthLabel} range={rangeParam} />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">范围</span>
            <EnhancedRangePicker />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rangeParam !== 'month' && (
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">{rLabel}支出</CardTitle></CardHeader>
            <CardContent className="pt-0 text-2xl font-bold">{`${sym}${rexpense.toFixed(2)}`}</CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">本月支出</CardTitle></CardHeader>
          <CardContent className="pt-0 text-2xl font-bold">{`${sym}${expense.toFixed(2)}`}</CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">图表概览（{currency}）</h2>
        <ChartSummary trend={trend} pieMonth={pie} pieRange={(rRows as any[]).length? (() => { const by=new Map<string,number>(); (rRows as any[]).forEach((r:any)=>{ if(r.type==='expense'){ by.set(r.category,(by.get(r.category)||0)+Number(r.amount||0)); }}); return Array.from(by.entries()).map(([name,value])=>({name,value})); })() : []} defaultMode={rangeParam!=='month'?'range':'month'} currency={currency} />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top 10 支出（{currency}）</h2>
          <div className="flex gap-1 text-xs">
            <Link href={`/?currency=${currency}&range=today&month=${monthLabel}`}><Button variant={rangeParam!=='month'?'default':'secondary'} size="sm">今日</Button></Link>
            <Link href={`/?currency=${currency}&range=month&month=${monthLabel}`}><Button variant={rangeParam==='month'?'default':'secondary'} size="sm">本月</Button></Link>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            <TopExpenses items={top10 as any} currency={currency} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
