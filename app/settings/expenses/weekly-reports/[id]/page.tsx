'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import {
  getWeeklyReportById,
  formatWeekRange,
  type WeeklyReport,
} from '@/lib/services/weeklyReportService';
import {
  ChevronLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Store,
  CreditCard,
  Sparkles,
  BarChart3,
  PieChart,
  Info,
} from 'lucide-react';

export default function WeeklyReportDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await getWeeklyReportById(parseInt(id));
      setReport(data);
    } catch (error) {
      console.error('获取报告详情失败:', error);
      setError('获取报告详情失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageSkeleton stats={4} listItems={3} listColumns={1} />;
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings/expenses/weekly-reports">
              <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4 mr-2" />
                返回报告列表
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="text-red-500 dark:text-red-400 mb-4">{error || '报告不存在'}</div>
            <Link href="/settings/expenses/weekly-reports">
              <Button>返回列表</Button>
            </Link>
          </div>
        </div>
      </div>
    );
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

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">周报告详情</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            {formatWeekRange(report.week_start_date, report.week_end_date)}
          </p>
        </div>

        {/* 统计概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ¥{report.total_expenses.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">总支出</div>
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
                    {report.transaction_count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">交易笔数</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {report.week_over_week_percentage !== null && report.week_over_week_percentage >= 0 ? (
                      <>
                        <TrendingUp className="h-5 w-5 text-red-600" />
                        <div className="text-2xl font-bold text-red-600">
                          +{report.week_over_week_percentage}%
                        </div>
                      </>
                    ) : report.week_over_week_percentage !== null ? (
                      <>
                        <TrendingDown className="h-5 w-5 text-green-600" />
                        <div className="text-2xl font-bold text-green-600">
                          {report.week_over_week_percentage}%
                        </div>
                      </>
                    ) : (
                      <div className="text-2xl font-bold text-gray-400">-</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">环比上周</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {report.week_over_week_change !== null
                      ? `${report.week_over_week_change >= 0 ? '+' : ''}¥${Math.abs(report.week_over_week_change).toLocaleString()}`
                      : '-'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">环比变化</div>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI 分析摘要 */}
        {report.ai_summary && (
          <Card className="border-0 shadow-lg mb-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-purple-900 dark:text-purple-100">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI 分析摘要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-purple-800 dark:text-purple-200 leading-relaxed">
                {report.ai_summary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 分类支出统计 */}
        <Card className="border-0 shadow-lg mb-8 bg-white dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b dark:border-gray-700">
            <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <PieChart className="h-5 w-5 text-blue-600" />
              </div>
              <span>分类支出统计</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                ({report.category_breakdown.length} 个分类)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {report.category_breakdown.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                暂无分类数据
              </div>
            ) : (
              <div className="space-y-3">
                {report.category_breakdown.map((cat, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {cat.category}
                        </h4>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {cat.count} 笔
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        ¥{cat.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {cat.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* TOP 5 商家 */}
        {report.top_merchants.length > 0 && (
          <Card className="border-0 shadow-lg mb-8 bg-white dark:bg-gray-800">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b dark:border-gray-700">
              <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Store className="h-5 w-5 text-green-600" />
                </div>
                <span>TOP 5 消费商家</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {report.top_merchants.map((merchant, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {merchant.merchant}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {merchant.count} 笔交易
                        </p>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      ¥{merchant.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 支付方式统计 */}
        {report.payment_method_breakdown.length > 0 && (
          <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b dark:border-gray-700">
              <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <span>支付方式统计</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.payment_method_breakdown.map((payment, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {payment.payment_method}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {payment.count} 笔
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        ¥{payment.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                        {payment.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 报告元信息 */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">报告信息</p>
              <p className="text-blue-700 dark:text-blue-300">
                生成时间：{new Date(report.created_at).toLocaleString('zh-CN')} ·
                生成方式：{report.generated_by === 'cron_job' ? '定时任务' : '手动触发'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
