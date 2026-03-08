'use client';

import React, { useCallback } from 'react';
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
import {
  useRefreshQueue,
  useStopRefreshQueueOnSnapshotChange,
  useTransactionRefreshLifecycle,
} from '@/hooks/useTransactionsSync';
import { buildTransactionPageHref } from '@/lib/services/transaction/pageParams';

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
};

export default function HomePageClient({
  data,
}: HomePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const refreshCallback = useCallback(() => router.refresh(), [router]);
  const { isRefreshing, triggerQueue, stopQueue } = useRefreshQueue({
    delays: REFRESH_DELAYS_MS,
    refresh: refreshCallback,
    peekDirty: peekTransactionsDirty,
    consumeDirty: consumeTransactionsDirty,
  });

  useTransactionRefreshLifecycle({
    triggerQueue,
    stopQueue,
    peekDirty: peekTransactionsDirty,
  });
  useStopRefreshQueueOnSnapshotChange({
    refreshSnapshot: data.refreshSnapshot,
    stopQueue,
  });

  const handleCalendarDayClick = useCallback(
    (dateStr: string) => {
      router.push(
        buildTransactionPageHref(pathname, search?.toString(), {
          range: 'custom',
          start: dateStr,
          end: dateStr,
          month: null,
        }) as any
      );
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
            <CurrencySelect value={data.currency} />
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
        {...data.statsView}
      />

      {/* 图表概览 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{`${TEXT.chartsTitle} (${data.currency})`}</h2>
        <ChartSummary {...data.chartSummaryView} />
      </section>

      {/* Top 10 支出 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{`${TEXT.topTitle} (${data.currency})`}</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            💡 需要 AI 财务分析？请前往
            <a href="/records" className="text-blue-600 hover:text-blue-800 underline ml-1">
              账单列表
            </a>
          </div>
        </div>
        <Card>
          <CardContent className="pt-4">
            <TopExpenses {...data.topExpensesView} />
          </CardContent>
        </Card>
      </section>

      {/* 消费日历热力图 */}
      <section>
        <CalendarHeatmap
          {...data.calendarHeatmapView}
          onDayClick={handleCalendarDayClick}
        />
      </section>

    </div>
  );
}
