'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ProgressToast } from '@/components/shared/ProgressToast';
import {
  getAllWeeklyReports,
  generateWeeklyReport,
  formatWeekRange,
  getWeekDescription,
  type WeeklyReport,
} from '@/lib/services/weeklyReportService';
import {
  ChevronLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  FileText,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  BarChart3,
} from 'lucide-react';

export default function WeeklyReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await getAllWeeklyReports(20);
      setReports(data);
    } catch (error) {
      console.error('获取周报告失败:', error);
      setToastMessage('❌ 获取周报告失败');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await generateWeeklyReport();
      setToastMessage('✅ 周报告生成成功');
      setShowToast(true);
      // 刷新列表
      await fetchReports();
    } catch (error) {
      console.error('生成周报告失败:', error);
      setToastMessage('❌ 生成周报告失败');
      setShowToast(true);
    } finally {
      setGenerating(false);
    }
  };

  // 计算总览数据
  const latestReport = reports[0];
  const totalReports = reports.length;

  if (loading) {
    return <PageSkeleton stats={3} listItems={4} listColumns={1} />;
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
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">每周消费报告</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              查看每周消费趋势，洞察消费习惯
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? '生成中...' : '生成报告'}
          </Button>
        </div>

        {/* 统计卡片 */}
        {latestReport && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      ¥{latestReport.total_expenses.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      最近一周支出
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {latestReport.transaction_count}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      交易笔数
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {latestReport.week_over_week_percentage !== null && latestReport.week_over_week_percentage >= 0 ? (
                        <>
                          <TrendingUp className="h-5 w-5 text-red-600" />
                          <div className="text-2xl font-bold text-red-600">
                            +{latestReport.week_over_week_percentage}%
                          </div>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-5 w-5 text-green-600" />
                          <div className="text-2xl font-bold text-green-600">
                            {latestReport.week_over_week_percentage}%
                          </div>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      环比上周
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 报告列表 */}
        <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b dark:border-gray-700">
            <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span>历史报告</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                (共 {totalReports} 份)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">暂无周报告</p>
                <Button onClick={handleGenerate} disabled={generating}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成第一份报告
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/settings/expenses/weekly-reports/${report.id}`}
                    className="block group"
                  >
                    <div className="relative rounded-xl border-2 border-gray-200 dark:border-gray-700 p-5 transition-all duration-200 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
                              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                                {getWeekDescription(report.week_start_date)}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatWeekRange(report.week_start_date, report.week_end_date)}
                              </p>
                            </div>
                          </div>

                          {/* 关键数据 */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                总支出
                              </div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                ¥{report.total_expenses.toLocaleString()}
                              </div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                交易笔数
                              </div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {report.transaction_count}
                              </div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                环比
                              </div>
                              <div className={`text-lg font-semibold ${
                                (report.week_over_week_percentage || 0) >= 0
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }`}>
                                {report.week_over_week_percentage !== null
                                  ? `${report.week_over_week_percentage >= 0 ? '+' : ''}${report.week_over_week_percentage}%`
                                  : '-'}
                              </div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                分类数
                              </div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {report.category_breakdown.length}
                              </div>
                            </div>
                          </div>

                          {/* AI 摘要 */}
                          {report.ai_summary && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-purple-900 dark:text-purple-100 line-clamp-2">
                                  {report.ai_summary}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 查看详情箭头 */}
                        <div className="ml-4 flex items-center text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Toast提示 */}
        {showToast && (
          <ProgressToast
            message={toastMessage}
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </div>
  );
}
