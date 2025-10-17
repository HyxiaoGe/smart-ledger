"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { ChartSummary } from './components/ChartSummary';
import { AiAnalyzeButton } from './components/AiAnalyze';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedRangePicker } from '@/components/EnhancedRangePicker';
import { CurrencySelect } from '@/components/CurrencySelect';
import { TopExpenses } from '@/components/TopExpenses';
import { HomeStats } from '@/components/HomeStats';
import {
  StatsSkeleton,
  ChartSkeleton,
  TopExpensesSkeleton,
  PageHeaderSkeleton
} from '@/components/LoadingStates';
import { useSearchParams } from 'next/navigation';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/config';
import { parseMonthStr, formatMonth } from '@/lib/date';
import { supabase } from '@/lib/supabaseClient';

function symbolOf(code: string) {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return found?.symbol ?? '';
}

// 简单的缓存机制，减少不必要的 Promise 创建
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30秒缓存

// 优化的数据加载函数 - 减少不必要的 Promise 创建
async function loadPageData(currency: string, monthLabel: string, rangeParam: string, startParam?: string, endParam?: string) {
  try {
    const cacheKey = `${currency}_${monthLabel}_${rangeParam}_${startParam}_${endParam}`;

    // 检查缓存，避免重复的数据库请求
    const cached = dataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // 只在真正需要时才创建并行请求 - Promise.all 的合理使用场景
    const baseDate = parseMonthStr(monthLabel) || new Date();
    const [monthData, rangeData, topData] = await Promise.all([
      loadMonthData(currency, baseDate),
      loadRangeData(currency, rangeParam, monthLabel, startParam, endParam),
      loadTopData(currency, rangeParam, monthLabel, startParam, endParam)
    ]);

    const result = {
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

    // 缓存结果，减少后续请求
    dataCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error('Failed to load page data:', error);
    throw error;
  }
}

async function loadMonthData(currency: string, date: Date) {
  // 月份数据加载逻辑（从原页面迁移）
  function monthRange(d = new Date()) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const prevEnd = new Date(d.getFullYear(), d.getMonth(), 1);
    const toISO = (d: Date) => d.toISOString().slice(0, 10);
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

  // 数据处理逻辑保持同步，避免不必要的 Promise
  const processData = (curRows: any[], prevRows: any[]) => {
    const sum = (arr: any[], pred: (r: any) => boolean) =>
      arr.filter(pred).reduce((a, b) => a + Number(b.amount || 0), 0);

    const income = sum(curRows, (r) => r.type === 'income');
    const expense = sum(curRows, (r) => r.type === 'expense');
    const balance = income - expense;

    // 趋势数据 - 同步处理
    const byDay = new Map<string, number>();
    for (const r of curRows) {
      if (r.type !== 'expense') continue;
      const day = String(new Date(r.date).getDate());
      byDay.set(day, (byDay.get(day) || 0) + Number(r.amount || 0));
    }
    const trend = Array.from(byDay.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([name, expense]) => ({ name, expense }));

    // 饼图数据 - 同步处理
    const byCat = new Map<string, number>();
    for (const r of curRows) {
      if (r.type !== 'expense') continue;
      byCat.set(r.category, (byCat.get(r.category) || 0) + Number(r.amount || 0));
    }
    const pie = Array.from(byCat.entries()).map(([name, value]) => ({ name, value }));

    // 对比数据 - 同步处理
    const prevIncome = sum(prevRows, (r) => r.type === 'income');
    const prevExpense = sum(prevRows, (r) => r.type === 'expense');
    const compare = [
      { name: '本月', income, expense },
      { name: '上月', income: prevIncome, expense: prevExpense }
    ];

    return { income, expense, balance, trend, pie, compare };
  };

  return processData(rows, prevRows);
}

async function loadRangeData(currency: string, rangeParam: string, monthLabel: string, startParam?: string, endParam?: string) {
  // 范围数据加载逻辑
  let rStart, rEnd, rLabel;

  if (rangeParam === 'custom' && startParam && endParam) {
    rStart = startParam;
    rEnd = endParam;
    rLabel = `${startParam} - ${endParam}`;
  } else {
    const { getQuickRange } = await import('@/lib/date');
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

  const isSingleDay = (rangeParam === 'today' || rangeParam === 'yesterday') || (rStart === rEnd);

  if (isSingleDay) {
    query = query.eq('date', rStart);
  } else {
    if (rangeParam === 'custom') {
      const endDate = new Date(rEnd);
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = endDate.toISOString().slice(0, 10);
      query = query.gte('date', rStart).lt('date', endDateStr);
    } else {
      query = query.gte('date', rStart).lt('date', rEnd);
    }
  }

  const { data: rRows } = await query;
  const rows = rRows || [];
  const expense = rows.filter(r => r.type === 'expense').reduce((a, b) => a + Number(b.amount || 0), 0);

  return { expense, label: rLabel, rows };
}

async function loadTopData(currency: string, rangeParam: string, monthLabel: string, startParam?: string, endParam?: string) {
  // Top支出数据加载逻辑
  let rStart, rEnd;

  if (rangeParam === 'custom' && startParam && endParam) {
    rStart = startParam;
    rEnd = endParam;
  } else {
    const { getQuickRange } = await import('@/lib/date');
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

// 主要内容组件
function HomePageContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currency = SUPPORTED_CURRENCIES.some((c) => c.code === (searchParams?.get('currency') || ''))
    ? (searchParams!.get('currency') as string)
    : DEFAULT_CURRENCY;
  const rangeParam = (searchParams?.get('range') as string) || 'today';
  const monthParam = searchParams?.get('month');
  const startParam = searchParams?.get('start');
  const endParam = searchParams?.get('end');
  const baseDate = parseMonthStr(monthParam || formatMonth(new Date())) || new Date();
  const monthLabel = formatMonth(baseDate);
  const sym = symbolOf(currency);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const pageData = await loadPageData(currency, monthLabel, rangeParam, startParam, endParam);
        setData(pageData);
      } catch (err) {
        console.error('Failed to load page data:', err);
        setError('加载数据失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currency, monthLabel, rangeParam, startParam, endParam]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>刷新页面</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 - 立即显示 */}
      <div className="flex gap-3 items-center justify-between">
        <AiAnalyzeButton currency={currency} month={monthLabel} />
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

      {/* 统计数据 */}
      <Suspense fallback={<StatsSkeleton />}>
        {loading ? (
          <StatsSkeleton />
        ) : (
          <HomeStats
            initialIncome={data.income}
            initialExpense={data.expense}
            initialBalance={data.balance}
            initialRangeExpense={data.rangeExpense}
            currency={currency}
            rangeLabel={data.rangeLabel}
            monthLabel={monthLabel}
          />
        )}
      </Suspense>

      {/* 图表概览 */}
      <Suspense fallback={<ChartSkeleton />}>
        {loading ? (
          <ChartSkeleton />
        ) : (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">图表概览（{currency}）</h2>
            <ChartSummary
              trend={data.trend}
              pieMonth={data.pie}
              pieRange={data.rangeRows?.length ? (() => {
                const by = new Map<string, number>();
                data.rangeRows.forEach((r: any) => {
                  if (r.type === 'expense') {
                    by.set(r.category, (by.get(r.category) || 0) + Number(r.amount || 0));
                  }
                });
                return Array.from(by.entries()).map(([name, value]) => ({ name, value }));
              })() : []}
              currency={currency}
            />
          </section>
        )}
      </Suspense>

      {/* Top 10 支出 */}
      <Suspense fallback={<TopExpensesSkeleton />}>
        {loading ? (
          <TopExpensesSkeleton />
        ) : (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Top 10 支出（{currency}）</h2>
              <div className="flex gap-1 text-xs">
                <Button
                  variant={rangeParam !== 'month' ? 'default' : 'outline'}
                  size="sm"
                  className={rangeParam !== 'month' ? '' : 'text-gray-600 hover:text-gray-800'}
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('currency', currency);
                    params.set('range', 'today');
                    params.set('month', monthLabel);
                    window.history.pushState(null, '', `/?${params.toString()}`);
                  }}
                >
                  今日
                </Button>
                <Button
                  variant={rangeParam === 'month' ? 'default' : 'outline'}
                  size="sm"
                  className={rangeParam === 'month' ? '' : 'text-gray-600 hover:text-gray-800'}
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('currency', currency);
                    params.set('range', 'month');
                    params.set('month', monthLabel);
                    window.history.pushState(null, '', `/?${params.toString()}`);
                  }}
                >
                  本月
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="pt-4">
                <TopExpenses items={data.top10} currency={currency} />
              </CardContent>
            </Card>
          </section>
        )}
      </Suspense>
    </div>
  );
}

// 主页面组件
export default function HomePageClient() {
  return (
    <Suspense fallback={<PageHeaderSkeleton />}>
      <HomePageContent />
    </Suspense>
  );
}