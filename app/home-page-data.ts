import { supabase } from '@/lib/clients/supabase/client';
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
  const [monthData, rangeData, topData] = await Promise.all([
    loadMonthData(currency, baseDate),
    loadRangeData(currency, rangeParam, monthLabel, startParam, endParam),
    loadTopData(currency, rangeParam, monthLabel, startParam, endParam)
  ]);

  return {
    income: monthData.income,
    expense: monthData.expense,
    balance: monthData.balance,
    trend: monthData.trend,
    pie: monthData.pie,
    compare: monthData.compare,
    rangeExpense: rangeData.expense,
    rangeLabel: rangeData.label,
    rangeRows: rangeData.rows,
    top10: topData
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

  const [cur, prev] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, category, amount, date, currency')
      .is('deleted_at', null)
      .gte('date', start)
      .lt('date', end)
      .eq('currency', currency),
    supabase
      .from('transactions')
      .select('type, amount, date, currency')
      .is('deleted_at', null)
      .gte('date', prevStart)
      .lt('date', prevEnd)
      .eq('currency', currency)
  ]);

  const rows = cur.data || [];
  const prevRows = prev.data || [];

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

async function loadRangeData(
  currency: string,
  rangeParam: string,
  monthLabel: string,
  startParam?: string,
  endParam?: string
): Promise<RangeData> {
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

  let query = supabase
    .from('transactions')
    .select('type, category, amount, date, currency')
    .is('deleted_at', null)
    .eq('currency', currency);

  const isSingleDay = rangeParam === 'today' || rangeParam === 'yesterday' || rStart === rEnd;

  if (isSingleDay) {
    query = query.eq('date', rStart);
  } else if (rangeParam === 'custom') {
    const endDate = new Date(rEnd);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().slice(0, 10);
    query = query.gte('date', rStart).lt('date', endDateStr);
  } else {
    query = query.gte('date', rStart).lt('date', rEnd);
  }

  const { data: rRows } = await query;
  const rows = rRows || [];
  const expense = rows.filter((r) => r.type === 'expense').reduce((a, b) => a + Number(b.amount || 0), 0);

  return { expense, label: rLabel, rows };
}

async function loadTopData(
  currency: string,
  rangeParam: string,
  monthLabel: string,
  startParam?: string,
  endParam?: string
) {
  let rStart: string;
  let rEnd: string;

  if (rangeParam === 'custom' && startParam && endParam) {
    rStart = startParam;
    rEnd = endParam;
  } else {
    const quickRange = getQuickRange(rangeParam as any, monthLabel);
    rStart = quickRange.start;
    rEnd = quickRange.end;
  }

  const { data: topData } = await supabase
    .from('transactions')
    .select('id, type, category, amount, date, note, currency')
    .is('deleted_at', null)
    .gte('date', rStart)
    .lt('date', rEnd)
    .eq('currency', currency)
    .eq('type', 'expense')
    .order('amount', { ascending: false })
    .limit(10);

  return topData || [];
}
