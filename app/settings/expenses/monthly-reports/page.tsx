'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { monthlyReportsApi, type MonthlyReport } from '@/lib/api/services/monthly-reports';
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
  BarChart3,
  Lock,
  Unlock
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

// 工具函数
function formatMonthDisplay(year: number, month: number): string {
  return `${year}年${month}月`;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

type FilterType = 'all' | 'thisYear' | 'lastYear';

export default function MonthlyReportsPage() {
  const [filter, setFilter] = useState<FilterType>('thisYear');
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [generateMonth, setGenerateMonth] = useState(new Date().getMonth() + 1);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();

  // 获取所有月报告
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['monthly-reports'],
    queryFn: () => monthlyReportsApi.list(),
  });

  // 生成月报告 mutation
  const generateMutation = useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      monthlyReportsApi.generate(year, month),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    },
    onError: () => {
      showToast('生成报告失败', 'error');
    },
  });

  // 筛选报告
  const filteredReports = reports.filter((report: MonthlyReport) => {
    switch (filter) {
      case 'thisYear':
        return report.year === currentYear;
      case 'lastYear':
        return report.year === currentYear - 1;
      default:
        return true;
    }
  });

  // 准备图表数据
  const chartData = [...filteredReports]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    })
    .map((report) => ({
      name: `${report.month}月`,
      总支出: report.total_expenses,
      固定支出: report.fixed_expenses,
      可变支出: report.variable_expenses,
    }));

  // 获取最新报告
  const latestReport = filteredReports.length > 0
    ? filteredReports.reduce((latest, report) => {
        if (report.year > latest.year) return report;
        if (report.year === latest.year && report.month > latest.month) return report;
        return latest;
      }, filteredReports[0])
    : null;

  const isLoading = reportsLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses">
            <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回消费配置
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">月度报告</h2>
            <p className="text-gray-600 dark:text-gray-300">
              查看月度消费分析，包含固定支出和日常消费的完整财务状况
            </p>
          </div>
        </div>

        {/* 生成报告区域 */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Plus className="h-5 w-5" />
              生成月报告
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">年份</label>
                <select
                  value={generateYear}
                  onChange={(e) => setGenerateYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">月份</label>
                <select
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => generateMutation.mutate({ year: generateYear, month: generateMonth })}
                disabled={generateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    生成报告
                  </>
                )}
              </Button>
            </div>
            <p className="mt-3 text-sm text-blue-700 dark:text-blue-300">
              月报告包含所有支出（固定支出 + 日常消费），展示完整的月度财务状况
            </p>
          </CardContent>
        </Card>

        {/* 最新报告概览 */}
        {latestReport && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                最新月报告概览 - {formatMonthDisplay(latestReport.year, latestReport.month)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">总支出</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    ¥{formatCurrency(latestReport.total_expenses)}
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm">固定支出</span>
                  </div>
                  <div className="text-xl font-bold text-orange-700 dark:text-orange-300">
                    ¥{formatCurrency(latestReport.fixed_expenses)}
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    占比 {((latestReport.fixed_expenses / latestReport.total_expenses) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                    <Unlock className="h-4 w-4" />
                    <span className="text-sm">可变支出</span>
                  </div>
                  <div className="text-xl font-bold text-green-700 dark:text-green-300">
                    ¥{formatCurrency(latestReport.variable_expenses)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    占比 {((latestReport.variable_expenses / latestReport.total_expenses) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                    {latestReport.month_over_month_percentage && latestReport.month_over_month_percentage > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="text-sm">环比变化</span>
                  </div>
                  <div className={`text-xl font-bold ${
                    latestReport.month_over_month_percentage && latestReport.month_over_month_percentage > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {latestReport.month_over_month_percentage
                      ? formatPercentage(latestReport.month_over_month_percentage)
                      : '-'}
                  </div>
                </div>
              </div>

              <Link href={`/settings/expenses/monthly-reports/${latestReport.id}`}>
                <Button variant="outline" className="w-full">
                  查看详细报告
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 趋势图表 */}
        {chartData.length > 1 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>支出趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [`¥${formatCurrency(value)}`, '']}
                    />
                    <Legend />
                    <Bar dataKey="固定支出" stackId="a" fill="#f97316" />
                    <Bar dataKey="可变支出" stackId="a" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 筛选器 */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'thisYear', label: '今年' },
            { value: 'lastYear', label: '去年' },
            { value: 'all', label: '全部' },
          ].map((item) => (
            <Button
              key={item.value}
              variant={filter === item.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(item.value as FilterType)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* 报告列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              历史月报告
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>暂无月报告</p>
                <p className="text-sm mt-2">选择年月并点击"生成报告"来创建月度报告</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports
                  .sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return b.month - a.month;
                  })
                  .map((report: MonthlyReport) => (
                    <Link
                      key={report.id}
                      href={`/settings/expenses/monthly-reports/${report.id}`}
                      className="block"
                    >
                      <div className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {formatMonthDisplay(report.year, report.month)}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {report.transaction_count} 笔交易
                                <span className="mx-2">·</span>
                                固定 {report.fixed_transaction_count} 笔
                                <span className="mx-2">·</span>
                                日常 {report.variable_transaction_count} 笔
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              ¥{formatCurrency(report.total_expenses)}
                            </div>
                            {report.month_over_month_percentage !== null && (
                              <div className={`text-sm flex items-center justify-end gap-1 ${
                                report.month_over_month_percentage > 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}>
                                {report.month_over_month_percentage > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {formatPercentage(report.month_over_month_percentage)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
