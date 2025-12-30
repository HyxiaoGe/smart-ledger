'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { weeklyReportsApi, type WeeklyReport } from '@/lib/api/services/weekly-reports';
import {
  ChevronLeft,
  TrendingDown,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  ArrowRight,
  Loader2,
  BarChart3
} from 'lucide-react';

// 工具函数
function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.getMonth() + 1;
  const startDay = start.getDate();
  const endMonth = end.getMonth() + 1;
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth}月${startDay}日 - ${endDay}日`;
  } else {
    return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
  }
}

function getWeekDescription(date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();

  const firstDayOfYear = new Date(year, 0, 1);
  const daysDiff = Math.floor(
    (d.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weekNumber = Math.ceil((daysDiff + firstDayOfYear.getDay() + 1) / 7);

  return `${year}年第${weekNumber}周`;
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '0.00';
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercentage(value: number | null | undefined): string {
  if (value == null) return '+0.0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

type FilterType = 'all' | 'thisWeek' | 'thisMonth' | 'lastMonth';

function getStartOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getEndOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function isDateRangeOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA <= endB && endA >= startB;
}

export default function WeeklyReportsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // 获取所有周报告
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['weekly-reports'],
    queryFn: () => weeklyReportsApi.list(),
  });

  // 获取最新周报告
  const { data: latestReport, isLoading: latestLoading } = useQuery({
    queryKey: ['weekly-reports', 'latest'],
    queryFn: () => weeklyReportsApi.getLatest(),
  });

  // 生成周报告 mutation
  const generateMutation = useMutation({
    mutationFn: () => weeklyReportsApi.generate(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-reports'] });
      if (result.success) {
        showToast('报告生成成功！', 'success');
      } else {
        showToast(result.message, 'info');
      }
    },
    onError: () => {
      showToast('生成报告失败，请稍后重试', 'error');
    },
  });

  const loading = reportsLoading || latestLoading;
  const generating = generateMutation.isPending;

  // 根据筛选条件过滤报告
  const filteredReports = useMemo(() => {
    if (filter === 'all') {
      return reports;
    }

    const now = new Date();
    return reports.filter(report => {
      const reportWeekStart = getStartOfDay(new Date(report.week_start_date));
      const reportWeekEnd = getEndOfDay(new Date(report.week_end_date));

      switch (filter) {
        case 'thisMonth': {
          const monthStart = getStartOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
          const monthEnd = getEndOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
          return isDateRangeOverlap(reportWeekStart, reportWeekEnd, monthStart, monthEnd);
        }
        case 'lastMonth': {
          const lastMonthStart = getStartOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
          const lastMonthEnd = getEndOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
          return isDateRangeOverlap(reportWeekStart, reportWeekEnd, lastMonthStart, lastMonthEnd);
        }
        default:
          return true;
      }
    });
  }, [filter, reports]);

  const trendSource = filter === 'all' ? reports : filteredReports;

  function handleGenerateReport() {
    generateMutation.mutate();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回消费配置
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">每周消费报告</h2>
            <p className="text-gray-600 dark:text-gray-300">
              自动生成的周度消费分析，帮助您洞察消费趋势和习惯
            </p>
          </div>
          <Button
            onClick={handleGenerateReport}
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {generating ? '生成中...' : '手动生成报告'}
          </Button>
        </div>

        {/* 快速筛选 */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-sm text-gray-600 dark:text-gray-300">筛选：</span>
          <div className="flex gap-2">
            {[
              { value: 'all' as FilterType, label: '全部' },
              { value: 'thisMonth' as FilterType, label: '本月' },
              { value: 'lastMonth' as FilterType, label: '上月' }
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === item.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {filter !== 'all' && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({filteredReports.length} 条记录)
            </span>
          )}
        </div>

        {/* 最新报告统计卡片 */}
        {!latestReport ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    最新周总支出
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ¥{formatCurrency(latestReport.total_expenses)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatWeekRange(latestReport.week_start_date, latestReport.week_end_date)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    交易笔数
                  </CardTitle>
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {latestReport.transaction_count}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  平均 ¥{formatCurrency(latestReport.average_transaction ?? 0)}/笔
                </p>
              </CardContent>
            </Card>

            <Card className={`${
              latestReport.week_over_week_percentage > 0
                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-sm font-medium ${
                    latestReport.week_over_week_percentage > 0
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-green-700 dark:text-green-300'
                  }`}>
                    较上周
                  </CardTitle>
                  {latestReport.week_over_week_percentage > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className={`text-2xl font-bold ${
                  latestReport.week_over_week_percentage > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {formatPercentage(latestReport.week_over_week_percentage)}
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-xs ${
                  latestReport.week_over_week_percentage > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  与上周对比
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    报告总数
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {reports.length}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  累计生成报告
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 消费趋势图 */}
        {trendSource.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <CardTitle>
                  {filter === 'all' ? '消费趋势（最近8周）' : '消费趋势（筛选范围内最近8周）'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={trendSource.slice(0, 8).reverse().map(report => ({
                    name: getWeekDescription(report.week_start_date).replace('第', ''),
                    amount: Number(report.total_expenses),
                    count: report.transaction_count
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    tickFormatter={(value) =>
                      Math.abs(value) >= 1000
                        ? `¥${(value / 1000).toFixed(1)}k`
                        : `¥${value}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'amount') {
                        return [`¥${formatCurrency(value)}`, '总支出'];
                      }
                      return [value, '交易笔数'];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#9333ea"
                    strokeWidth={2}
                    dot={{ fill: '#9333ea', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 报告列表 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">历史报告</h3>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {filter === 'all' ? '暂无周报告数据' : '该时间段暂无报告'}
                </p>
                {filter === 'all' && (
                  <Button onClick={handleGenerateReport} disabled={generating}>
                    {generating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {generating ? '生成中...' : '生成第一份报告'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredReports.map((report) => (
              <Link key={report.id} href={`/settings/expenses/weekly-reports/${report.id}`}>
                <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {getWeekDescription(report.week_start_date)}
                          </h4>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatWeekRange(report.week_start_date, report.week_end_date)}
                          </span>
                          {report.generation_type === 'manual' && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              手动生成
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-6 mt-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">总支出</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              ¥{formatCurrency(report.total_expenses)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">交易笔数</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {report.transaction_count} 笔
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">较上周</p>
                            <p className={`text-lg font-semibold ${
                              report.week_over_week_percentage > 0
                                ? 'text-red-500'
                                : 'text-green-500'
                            }`}>
                              {formatPercentage(report.week_over_week_percentage)}
                            </p>
                          </div>
                        </div>

                        {report.ai_insights && (
                          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {report.ai_insights}
                          </p>
                        )}
                      </div>

                      <ArrowRight className="h-5 w-5 text-gray-400 ml-4 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
