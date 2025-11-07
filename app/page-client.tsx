'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChartSummary } from './components/ChartSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RangePicker } from '@/components/shared/RangePicker';
import { CurrencySelect } from '@/components/shared/CurrencySelect';
import { TopExpenses } from '@/components/TopExpenses';
import { HomeStats } from '@/components/features/statistics/HomeStats';
import { HomeQuickTransaction } from '@/components/features/transactions/QuickTransaction/HomeQuickTransaction';
import type { PageData } from './home-page-data';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useAutoGenerateRecurring } from '@/hooks/useAutoGenerateRecurring';

const TEXT = {
  currency: '币种',
  range: '范围',
  refreshing: '同步最新数据中...',
  chartsTitle: '图表概览',
  topTitle: 'Top 10 支出',
  today: '今日',
  month: '本月'
} as const;

type HomePageClientProps = {
  data: PageData;
  currency: string;
  rangeParam: string;
  monthLabel: string;
};

type ChartSlice = {
  name: string;
  value: number;
};

function buildRangePie(
  rows: Array<{ type: string; category: string; amount: number }>
): ChartSlice[] {
  const byCategory = new Map<string, number>();
  rows.forEach((row) => {
    if (row.type !== 'expense') return;
    const key = row.category;
    byCategory.set(key, (byCategory.get(key) || 0) + Number(row.amount || 0));
  });
  return Array.from(byCategory.entries()).map(([name, value]) => ({ name, value }));
}

export default function HomePageClient({
  data,
  currency,
  rangeParam,
  monthLabel
}: HomePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 固定支出相关状态
  const [recurringExpenses, setRecurringExpenses] = useState([]);

  // 使用全局自动生成Hook
  const { lastResult } = useAutoGenerateRecurring(recurringExpenses);

  // 获取固定支出列表
  useEffect(() => {
    fetchRecurringExpenses();
  }, []);

  const fetchRecurringExpenses = async () => {
    try {
      const response = await fetch('/api/recurring-expenses');
      if (response.ok) {
        const data = await response.json();
        setRecurringExpenses(data);
      }
    } catch (error) {
      console.error('获取固定支出列表失败:', error);
    }
  };

  // 监听自动生成结果，静默刷新数据（完全无感知）
  useEffect(() => {
    if (lastResult && lastResult.generated > 0) {
      // 静默刷新页面数据，不显示任何提示
      setTimeout(() => {
        router.refresh();
      }, 1000);
    }
  }, [lastResult, router]);

  // 使用通用的自动刷新 Hook
  const { isRefreshing } = useAutoRefresh({
    events: ['transaction_added', 'transaction_updated', 'transaction_deleted'],
    onRefresh: () => router.refresh(),
    dataSnapshot: {
      income: data.income,
      expense: data.expense,
      balance: data.balance,
      rangeExpense: data.rangeExpense
    }
  });

  const pieRange = useMemo(
    () => (data.rangeRows?.length ? buildRangePie(data.rangeRows) : []),
    [data.rangeRows]
  );

  const updateRange = (nextRange: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('currency', currency);
    params.set('range', nextRange);
    params.set('month', monthLabel);
    if (nextRange !== 'custom') {
      params.delete('start');
      params.delete('end');
    }
    const nextUrl = `${pathname}?${params.toString()}`;
    router.push(nextUrl as Route);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">{TEXT.currency}</span>
            <CurrencySelect value={currency} month={monthLabel} range={rangeParam} />
          </div>
          {isRefreshing && <span className="text-xs text-blue-500 animate-pulse">{TEXT.refreshing}</span>}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">{TEXT.range}</span>
            <RangePicker />
          </div>
        </div>
      </div>

      <HomeStats
        initialIncome={data.income}
        initialExpense={data.expense}
        initialBalance={data.balance}
        initialRangeExpense={data.rangeExpense}
        currency={currency}
        rangeLabel={data.rangeLabel}
        monthLabel={monthLabel}
      />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{`${TEXT.chartsTitle} (${currency})`}</h2>
        <ChartSummary
          trend={data.trend}
          pieMonth={data.pie}
          pieRange={pieRange}
          currency={currency}
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{`${TEXT.topTitle} (${currency})`}</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            💡 需要 AI 财务分析？请前往
            <a href="/records" className="text-blue-600 hover:text-blue-800 underline ml-1">
              账单列表
            </a>
          </div>
          <div className="flex gap-1 text-xs">
            <Button
              variant={rangeParam !== 'month' ? 'default' : 'outline'}
              size="sm"
              className={rangeParam !== 'month' ? '' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}
              onClick={() => updateRange('today')}
            >
              {TEXT.today}
            </Button>
            <Button
              variant={rangeParam === 'month' ? 'default' : 'outline'}
              size="sm"
              className={rangeParam === 'month' ? '' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}
              onClick={() => updateRange('month')}
            >
              {TEXT.month}
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            <TopExpenses items={data.top10} currency={currency} />
          </CardContent>
        </Card>
      </section>

      {/* 快速记账悬浮按钮 */}
      <HomeQuickTransaction />
    </div>
  );
}
