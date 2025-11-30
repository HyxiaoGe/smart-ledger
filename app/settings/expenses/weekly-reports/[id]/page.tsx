'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { weeklyReportsApi } from '@/lib/api/services/weekly-reports';
import { ApiError } from '@/lib/api/client';
import {
  ChevronLeft,
  DollarSign,
  FileText,
  BarChart3,
  Store,
  Lightbulb,
} from 'lucide-react';

import {
  ReportHeader,
  StatCards,
  OverviewTab,
  ChartsTab,
  MerchantsTab,
  InsightsTab,
  ReportMeta,
} from './components';

// 加载骨架屏组件
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8" />
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// 未找到报告组件
function NotFoundState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/settings/expenses/weekly-reports">
            <Button variant="ghost">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回报告列表
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">报告不存在或已被删除</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function WeeklyReportDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // 使用 React Query 获取周报告详情
  const { data: report, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['weekly-report', id],
    queryFn: () => weeklyReportsApi.get(id),
    enabled: !!id,
  });

  const notFound = fetchError instanceof ApiError && fetchError.status === 404;

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (notFound || !report) {
    return <NotFoundState />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses/weekly-reports">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回报告列表
            </Button>
          </Link>
        </div>

        {/* 报告标题 */}
        <ReportHeader
          weekStartDate={report.week_start_date}
          weekEndDate={report.week_end_date}
          generationType={report.generation_type}
        />

        {/* 核心统计卡片 */}
        <StatCards
          totalExpenses={report.total_expenses}
          averageTransaction={report.average_transaction ?? 0}
          transactionCount={report.transaction_count}
          weekOverWeekPercentage={report.week_over_week_percentage}
          weekOverWeekChange={report.week_over_week_change ?? 0}
        />

        {/* Tab 切换 */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview" className="gap-2">
              <DollarSign className="h-4 w-4" />
              概览
            </TabsTrigger>
            <TabsTrigger value="charts" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              图表
            </TabsTrigger>
            <TabsTrigger value="merchants" className="gap-2">
              <Store className="h-4 w-4" />
              商家
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              洞察
            </TabsTrigger>
          </TabsList>

          <OverviewTab report={report} />
          <ChartsTab report={report} />
          <MerchantsTab report={report} />
          <InsightsTab report={report} />
        </Tabs>

        {/* 报告元数据 */}
        <ReportMeta
          generatedAt={report.generated_at}
          generationType={report.generation_type}
        />
      </div>
    </div>
  );
}
