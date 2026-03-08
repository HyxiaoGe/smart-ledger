'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChartSummary } from './components/ChartSummary';
import { CalendarHeatmap } from './components/CalendarHeatmap';
import { Card, CardContent } from '@/components/ui/card';
import { TabsRangePicker } from '@/components/shared/TabsRangePicker';
import { CurrencySelect } from '@/components/shared/CurrencySelect';
import { TopExpenses } from '@/components/TopExpenses';
import { HomeStats } from '@/components/features/statistics/HomeStats';
import type { PageData } from './home-page-data';
import { consumeTransactionsDirty, peekTransactionsDirty } from '@/lib/core/EnhancedDataSync';
import { useRefreshQueue, useTransactionRefreshLifecycle } from '@/hooks/useTransactionsSync';
import { useAutoGenerateRecurring } from '@/hooks/useAutoGenerateRecurring';

const REFRESH_DELAYS_MS = [1500, 3500, 6000];

const TEXT = {
  currency: '币种',
  range: '范围',
  refreshing: '同步最新数据中...',
  chartsTitle: '图表概览',
  topTitle: 'Top 10 支出',
} as const;

type HomePageClientProps = {
  data: PageData;
  currency: string;
  rangeParam: string;
  monthLabel: string;
};

export default function HomePageClient({
  data,
  currency,
  rangeParam,
  monthLabel,
}: HomePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  // 固定支出（从服务端数据获取，无需客户端请求）
  const recurringExpenses = data.recurringExpenses || [];

  // 使用全局自动生成Hook
  const { lastResult } = useAutoGenerateRecurring(recurringExpenses);
  const recurringRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 监听自动生成结果，静默刷新数据
  useEffect(() => {
    if (lastResult && typeof lastResult === 'object' && 'generated' in lastResult && (lastResult as any).generated > 0) {
      if (recurringRefreshTimer.current) {
        clearTimeout(recurringRefreshTimer.current);
      }
      recurringRefreshTimer.current = setTimeout(() => {
        router.refresh();
      }, 1000);
    }

    return () => {
      if (recurringRefreshTimer.current) {
        clearTimeout(recurringRefreshTimer.current);
        recurringRefreshTimer.current = null;
      }
    };
  }, [lastResult, router]);

  const refreshCallback = useCallback(() => router.refresh(), [router]);
  const { isRefreshing, triggerQueue, stopQueue } = useRefreshQueue({
    delays: REFRESH_DELAYS_MS,
    refresh: refreshCallback,
    peekDirty: peekTransactionsDirty,
    consumeDirty: consumeTransactionsDirty,
  });

  const latestSnapshot = useRef({
    rangeExpense: data.rangeExpense,
    rangeCount: data.rangeCount,
  });

  useTransactionRefreshLifecycle({
    triggerQueue,
    stopQueue,
    peekDirty: peekTransactionsDirty,
  });

  // 数据变化检测和自动停止刷新队列
  useEffect(() => {
    const snapshot = latestSnapshot.current;
    const changed =
      snapshot.rangeExpense !== data.rangeExpense || snapshot.rangeCount !== data.rangeCount;

    if (changed) {
      latestSnapshot.current = {
        rangeExpense: data.rangeExpense,
        rangeCount: data.rangeCount,
      };
      stopQueue({ consume: true });
    }
  }, [data.rangeExpense, data.rangeCount, stopQueue]);

  const handleCalendarDayClick = useCallback(
    (dateStr: string) => {
      const sp = new URLSearchParams(search?.toString());
      sp.set('range', 'custom');
      sp.set('start', dateStr);
      sp.set('end', dateStr);
      sp.delete('month');
      router.push((pathname + '?' + sp.toString()) as any);
    },
    [router, pathname, search]
  );

  return (
    <div className="space-y-6">
      {/* 顶部控制栏 */}
      <div className="flex gap-3 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">{TEXT.currency}</span>
            <CurrencySelect value={currency} month={monthLabel} range={rangeParam} />
          </div>
          {isRefreshing && (
            <span className="text-xs text-blue-500 animate-pulse">{TEXT.refreshing}</span>
          )}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">{TEXT.range}</span>
            <TabsRangePicker />
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <HomeStats
        rangeExpense={data.rangeExpense}
        rangeCount={data.rangeCount}
        rangeDailyAvg={data.rangeDailyAvg}
        rangeLabel={data.rangeLabel}
        prevRangeExpense={data.prevRangeExpense}
        prevRangeLabel={data.prevRangeLabel}
        currency={currency}
        isSingleDay={data.isSingleDay}
        isToday={data.isToday}
      />

      {/* 图表概览 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{`${TEXT.chartsTitle} (${currency})`}</h2>
        <ChartSummary
          trend={data.trend}
          pie={data.pie}
          rangeLabel={data.rangeLabel}
          currency={currency}
        />
      </section>

      {/* Top 10 支出 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{`${TEXT.topTitle} (${currency})`}</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            💡 需要 AI 财务分析？请前往
            <a href="/records" className="text-blue-600 hover:text-blue-800 underline ml-1">
              账单列表
            </a>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            <TopExpenses items={data.top10} currency={currency} />
          </CardContent>
        </Card>
      </section>

      {/* 消费日历热力图 */}
      <section>
        <CalendarHeatmap
          data={data.calendarData}
          year={data.calendarYear}
          month={data.calendarMonth}
          currency={currency}
          onDayClick={handleCalendarDayClick}
        />
      </section>

    </div>
  );
}
