"use client";

import React, { useCallback, useEffect, useRef } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChartSummary } from './components/ChartSummary';
import { AiAnalyzeButton } from './components/AiAnalyze';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RangePicker } from '@/components/RangePicker';
import { CurrencySelect } from '@/components/CurrencySelect';
import { TopExpenses } from '@/components/TopExpenses';
import { HomeStats } from '@/components/HomeStats';
import type { PageData } from './home-page-data';
import { dataSync, consumeTransactionsDirty, peekTransactionsDirty } from '@/lib/dataSync';
import { useRefreshQueue } from '@/hooks/useTransactionsSync';

const REFRESH_DELAYS_MS = [1500, 3500, 6000];
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

function buildRangePie(rows: any[]) {
  const byCategory = new Map<string, number>();
  rows.forEach((row) => {
    if (row.type !== 'expense') return;
    const key = row.category;
    byCategory.set(key, (byCategory.get(key) || 0) + Number(row.amount || 0));
  });
  return Array.from(byCategory.entries()).map(([name, value]) => ({ name, value }));
}

export default function HomePageClient({ data, currency, rangeParam, monthLabel }: HomePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const refreshCallback = useCallback(() => router.refresh(), [router]);
  const { isRefreshing, triggerQueue, stopQueue } = useRefreshQueue({
    delays: REFRESH_DELAYS_MS,
    refresh: refreshCallback,
    peekDirty: peekTransactionsDirty,
    consumeDirty: consumeTransactionsDirty
  });

  const latestSnapshot = useRef({
    income: data.income,
    expense: data.expense,
    balance: data.balance,
    rangeExpense: data.rangeExpense
  });

  const pieRange = data.rangeRows?.length ? buildRangePie(data.rangeRows) : [];

  useEffect(() => {
    const handler = (event: any) => {
      triggerQueue('event');
    };

    const offAdded = dataSync.onEvent('transaction_added', handler);
    const offUpdated = dataSync.onEvent('transaction_updated', handler);
    const offDeleted = dataSync.onEvent('transaction_deleted', handler);

    if (peekTransactionsDirty()) {
      triggerQueue('mount');
    }

    return () => {
      offAdded();
      offUpdated();
      offDeleted();
      stopQueue();
    };
  }, [triggerQueue, stopQueue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onVisibility = () => {
      if (!document.hidden && peekTransactionsDirty()) {
        triggerQueue('visibility');
      }
    };
    window.addEventListener('visibilitychange', onVisibility);
    return () => window.removeEventListener('visibilitychange', onVisibility);
  }, [triggerQueue]);

  useEffect(() => {
    const snapshot = latestSnapshot.current;
    const changed =
      snapshot.income !== data.income ||
      snapshot.expense !== data.expense ||
      snapshot.balance !== data.balance ||
      snapshot.rangeExpense !== data.rangeExpense;

    if (changed) {
      latestSnapshot.current = {
        income: data.income,
        expense: data.expense,
        balance: data.balance,
        rangeExpense: data.rangeExpense
      };
      stopQueue({ consume: true });
    }
  }, [data.income, data.expense, data.balance, data.rangeExpense, stopQueue]);

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
        <AiAnalyzeButton currency={currency} month={monthLabel} />
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
        <ChartSummary trend={data.trend} pieMonth={data.pie} pieRange={pieRange} currency={currency} />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{`${TEXT.topTitle} (${currency})`}</h2>
          <div className="flex gap-1 text-xs">
            <Button
              variant={rangeParam !== 'month' ? 'default' : 'outline'}
              size="sm"
              className={rangeParam !== 'month' ? '' : 'text-gray-600 hover:text-gray-800'}
              onClick={() => updateRange('today')}
            >
              {TEXT.today}
            </Button>
            <Button
              variant={rangeParam === 'month' ? 'default' : 'outline'}
              size="sm"
              className={rangeParam === 'month' ? '' : 'text-gray-600 hover:text-gray-800'}
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
    </div>
  );
}
