'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  TrendingDown,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  ArrowRight
} from 'lucide-react';
import {
  getAllWeeklyReports,
  getLatestWeeklyReport,
  generateWeeklyReport,
  formatWeekRange,
  getWeekDescription,
  type WeeklyReport
} from '@/lib/services/weeklyReportService';

export default function WeeklyReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [latestReport, setLatestReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const [allReports, latest] = await Promise.all([
        getAllWeeklyReports(),
        getLatestWeeklyReport()
      ]);
      setReports(allReports);
      setLatestReport(latest);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport() {
    try {
      setGenerating(true);
      await generateWeeklyReport();
      await loadReports();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('生成报告失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
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
            <Plus className="h-4 w-4 mr-2" />
            {generating ? '生成中...' : '手动生成报告'}
          </Button>
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
                  ¥{latestReport.total_expenses.toFixed(2)}
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
                  平均 ¥{latestReport.average_transaction.toFixed(2)}/笔
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    周环比
                  </CardTitle>
                  {latestReport.week_over_week_change > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className={`text-2xl font-bold ${
                  latestReport.week_over_week_change > 0
                    ? 'text-red-500'
                    : 'text-green-500'
                }`}>
                  {latestReport.week_over_week_change > 0 ? '+' : ''}
                  {latestReport.week_over_week_change.toFixed(1)}%
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  较上周变化
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
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  暂无周报告数据
                </p>
                <Button onClick={handleGenerateReport} disabled={generating}>
                  <Plus className="h-4 w-4 mr-2" />
                  生成第一份报告
                </Button>
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
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
                              ¥{report.total_expenses.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">交易笔数</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {report.transaction_count} 笔
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">周环比</p>
                            <p className={`text-lg font-semibold ${
                              report.week_over_week_change > 0
                                ? 'text-red-500'
                                : 'text-green-500'
                            }`}>
                              {report.week_over_week_change > 0 ? '+' : ''}
                              {report.week_over_week_change.toFixed(1)}%
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
