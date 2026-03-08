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
import { ArrowRight, Brain, RefreshCw, WalletCards } from 'lucide-react';
import { SectionIntro } from '@/components/shared/SectionIntro';

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
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.14),_transparent_30%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_100%)] p-6 shadow-sm dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_100%)]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-medium text-sky-700 backdrop-blur dark:border-sky-900 dark:bg-slate-950/60 dark:text-sky-300">
              <WalletCards className="h-3.5 w-3.5" />
              今日决策面板
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                先看关键变化，再决定下一步
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                首页只保留最值得立即判断的信息：本期支出、变化幅度、主要结构和下一步入口。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm sm:inline-flex sm:w-auto sm:flex-none sm:flex-row sm:items-center sm:rounded-full sm:py-2 dark:border-slate-700 dark:bg-slate-950">
                <span className="text-slate-500 dark:text-slate-400">{data.toolbarView.currencyLabel}</span>
                <CurrencySelect value={data.currency} />
              </div>
              <div className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm sm:inline-flex sm:w-auto sm:flex-none sm:flex-row sm:items-center sm:rounded-full sm:py-2 dark:border-slate-700 dark:bg-slate-950">
                <span className="text-slate-500 dark:text-slate-400">{data.toolbarView.rangeLabel}</span>
                <TabsRangePicker className="w-full sm:w-auto" />
              </div>
              {isRefreshing && (
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {data.toolbarView.refreshingLabel}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900">
                  <Brain className="h-3.5 w-3.5" />
                  下一步建议
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  优先关注 Top 支出和日历热区
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  如果本期变化明显，先看大额支出；如果变化不大，再看热力图确认消费是否集中在某几天。
                </p>
              </div>
              <a
                href={data.sectionView.aiHintHref}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
              >
                {data.sectionView.aiHintLinkLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  重点 1
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {data.sectionView.topExpensesTitle}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  重点 2
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {data.sectionView.aiHintText}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeStats {...data.statsView} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <section className="space-y-3">
          <SectionIntro
            eyebrow="概览"
            title={data.sectionView.chartsTitle}
            description="先看整体趋势，再判断分类结构。"
          />
          <ChartSummary {...data.chartSummaryView} />
        </section>

        <section className="space-y-3">
          <SectionIntro
            eyebrow="重点"
            title={data.sectionView.topExpensesTitle}
            description="把最大的单笔和高频商户先看清楚。"
          />
          <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
            <CardContent className="p-5">
              <TopExpenses {...data.topExpensesView} />
            </CardContent>
          </Card>
        </section>
      </div>

      <section className="space-y-3">
        <SectionIntro
          eyebrow="节奏"
          title="消费节奏"
          description="用热力图判断支出是否集中在某几天，再决定要不要下钻看明细。"
          align="between"
          aside={
            <div className="text-xs text-slate-500 dark:text-slate-400">
              点击某一天会直接跳到对应日期的记录页
            </div>
          }
        />
        <div className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CalendarHeatmap
            {...data.calendarHeatmapView}
            onDayClick={handleCalendarDayClick}
          />
        </div>
      </section>
    </div>
  );
}
