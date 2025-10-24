/* eslint-disable */
'use server';

import { supabaseServerClient } from '@/lib/supabaseServer';
import { parseMonthStr, formatMonth, getQuickRange } from '@/lib/date';

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

type TopRow = {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
  currency?: string;
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
  top10: TopRow[];
};

const supabase = supabaseServerClient;

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
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString().slice(0, 10);
  const prevStart = new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString().slice(0, 10);
  const prevEnd = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);

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

  const sum = (arr: any[], predicate: (row: any) => boolean) =>
    arr.reduce((total, row) => (predicate(row) ? total + Number(row.amount || 0) : total), 0);

  const income = sum(rows, (row) => row.type === 'income');
  const expense = sum(rows, (row) => row.type === 'expense');
  const balance = income - expense;

  const trend = rows
    .filter((row) => row.type === 'expense')
    .map((row) => ({ date: row.date, amount: Number(row.amount || 0) }))
    .reduce<Map<string, number>>((map, row) => {
      const key = String(new Date(row.date).getDate());
      map.set(key, (map.get(key) || 0) + row.amount);
      return map;
    }, new Map())
    .entries();

  const trendPoints = Array.from(trendMap.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([name, value]) => ({ name, expense: value }));

  const pieMap = rows
    .filter((row) => row.type === 'expense')
    .reduce<Map<string, number>>((map, row) => {
      const key = row.category;
      map.set(key, (map.get(key) || 0) + Number(row.amount || 0));
      return map;
    }, new Map());

  const pie = Array.from(pieMap.entries()).map(([name, value]) => ({ name, value }));

  const prevIncome = sum(prevRows, (row) => row.type === 'income');
  const prevExpense = sum(prevRows, (row) => row.type === 'expense');
  const compare = [
    { name: '����', income, expense },
    { name: '����', income: prevIncome, expense: prevExpense }
  ];

  return { income, expense, balance, trend: trendPoints, pie, compare };
}

async function loadRangeData(
  currency: string,
  rangeParam: string,
  monthLabel: string,
  startParam?: string,
  endParam?: string
): Promise<RangeData> {
  let start: string;
  let end: string;
  let label: string;

  if (rangeParam === 'custom' && startParam && endParam) {
    start = startParam;
    end = endParam;
    label = `${startParam} - ${endParam}`;
  } else {
    const quickRange = getQuickRange(rangeParam as any, monthLabel);
    start = quickRange.start;
    end = quickRange.end;
    label = quickRange.label;
  }

  const isSingleDay = rangeParam === 'today' || rangeParam === 'yesterday' || start === end;
  let query = supabase
    .from('transactions')
    .select('type, category, amount, date, currency')
    .is('deleted_at', null)
    .eq('currency', currency);

  if (isSingleDay) {
    query = query.eq('date', start);
  } else if (rangeParam === 'custom') {
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);
    query = query.gte('date', start).lt('date', endDate.toISOString().slice(0, 10));
  } else {
    query = query.gte('date', start).lt('date', end);
  }

  const { data } = await query;
  const rows = data || [];
  const expense = rows.reduce(
    (total, row) => (row.type === 'expense' ? total + Number(row.amount || 0) : total),
    0
  );

  return { expense, label, rows };
}

async function loadTopData(
  currency: string,
  rangeParam: string,
  monthLabel: string,
  startParam?: string,
  endParam?: string
): Promise<TopRow[]> {
  let start: string;
  let end: string;

  if (rangeParam === 'custom' && startParam && endParam) {
    start = startParam;
    end = endParam;
  } else {
    const quickRange = getQuickRange(rangeParam as any, monthLabel);
    start = quickRange.start;
    end = quickRange.end;
  }

  const { data } = await supabase
    .from('transactions')
    .select('id, type, category, amount, date, note, currency')
    .is('deleted_at', null)
    .gte('date', start)
    .lt('date', end)
    .eq('currency', currency)
    .eq('type', 'expense')
    .order('amount', { ascending: false })
    .limit(10);

  return (data as TopRow[]) || [];
}
