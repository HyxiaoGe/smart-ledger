'use client';

import React from 'react';
import { ChartSummary } from './components/ChartSummary';
import { CalendarHeatmap } from './components/CalendarHeatmap';
import { Card, CardContent } from '@/components/ui/card';
import { TabsRangePicker } from '@/components/shared/TabsRangePicker';
import { CurrencySelect } from '@/components/shared/CurrencySelect';
import { TopExpenses } from '@/components/TopExpenses';
import { HomeStats } from '@/components/features/statistics/HomeStats';
import type { PageData } from './home-page-data';
import { useHomeDashboardController } from '@/hooks/useHomeDashboardController';

type HomePageClientProps = {
  data: PageData;
};

export default function HomePageClient({
  data,
}: HomePageClientProps) {
  const { isRefreshing, handleCalendarDayClick } = useHomeDashboardController(
    data.refreshSnapshot
  );

  return (
    <div className="space-y-6">
      {/* 顶部控制栏 */}
      <div className="flex gap-3 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">{data.toolbarView.currencyLabel}</span>
            <CurrencySelect value={data.currency} />
          </div>
          {isRefreshing && (
            <span className="text-xs text-blue-500 animate-pulse">
              {data.toolbarView.refreshingLabel}
            </span>
          )}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">{data.toolbarView.rangeLabel}</span>
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
        <h2 className="text-lg font-semibold">{data.sectionView.chartsTitle}</h2>
        <ChartSummary {...data.chartSummaryView} />
      </section>

      {/* Top 10 支出 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{data.sectionView.topExpensesTitle}</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {data.sectionView.aiHintText}
            <a
              href={data.sectionView.aiHintHref}
              className="text-blue-600 hover:text-blue-800 underline ml-1"
            >
              {data.sectionView.aiHintLinkLabel}
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
