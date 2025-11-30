'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { monthlyReportsApi, type MonthlyReport } from '@/lib/api/services/monthly-reports';
import {
  ChevronLeft,
  TrendingDown,
  TrendingUp,
  Calendar,
  DollarSign,
  Loader2,
  PieChart,
  Lock,
  Unlock,
  CreditCard,
  Store,
  BarChart3
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

// 分类颜色
const CATEGORY_COLORS: Record<string, string> = {
  food: '#ef4444',
  drink: '#f97316',
  transport: '#eab308',
  shopping: '#22c55e',
  entertainment: '#06b6d4',
  daily: '#3b82f6',
  housing: '#8b5cf6',
  medical: '#ec4899',
  education: '#14b8a6',
  subscription: '#6366f1',
  other: '#6b7280',
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

// 分类名称映射
const CATEGORY_NAMES: Record<string, string> = {
  food: '餐饮',
  drink: '饮品',
  transport: '交通',
  shopping: '购物',
  entertainment: '娱乐',
  daily: '日用',
  housing: '住房',
  medical: '医疗',
  education: '教育',
  subscription: '订阅',
  other: '其他',
};

// 支付方式名称映射
const PAYMENT_METHOD_NAMES: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  cash: '现金',
  card: '银行卡',
  creditcard: '信用卡',
  debitcard: '借记卡',
  '未指定': '其他',
};

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

function formatMonthDisplay(year: number, month: number): string {
  return `${year}年${month}月`;
}

function getCategoryName(category: string): string {
  return CATEGORY_NAMES[category.toLowerCase()] || category;
}

function getPaymentMethodName(method: string): string {
  return PAYMENT_METHOD_NAMES[method.toLowerCase()] || method;
}

export default function MonthlyReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['monthly-reports', id],
    queryFn: () => monthlyReportsApi.getById(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">报告不存在或加载失败</p>
          <Link href="/settings/expenses/monthly-reports">
            <Button variant="outline">返回列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 准备分类饼图数据
  const categoryChartData = report.category_breakdown.map((item) => ({
    name: getCategoryName(item.category),
    value: item.amount,
    percentage: item.percentage,
  }));

  // 准备支付方式数据
  const paymentChartData = report.payment_method_stats.map((item) => ({
    name: getPaymentMethodName(item.method),
    value: item.amount,
    percentage: item.percentage,
  }));

  // 固定支出 vs 可变支出饼图数据
  const expenseTypeData = [
    { name: '固定支出', value: report.fixed_expenses, color: '#f97316' },
    { name: '可变支出', value: report.variable_expenses, color: '#22c55e' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses/monthly-reports">
            <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回月报告列表
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {formatMonthDisplay(report.year, report.month)} 月度报告
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            生成时间：{new Date(report.generated_at).toLocaleString('zh-CN')}
          </p>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">总支出</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ¥{formatCurrency(report.total_expenses)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {report.transaction_count} 笔交易
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                <Lock className="h-4 w-4" />
                <span className="text-sm">固定支出</span>
              </div>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                ¥{formatCurrency(report.fixed_expenses)}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                {report.fixed_transaction_count} 笔 · 占比 {((report.fixed_expenses / report.total_expenses) * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                <Unlock className="h-4 w-4" />
                <span className="text-sm">可变支出</span>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                ¥{formatCurrency(report.variable_expenses)}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                {report.variable_transaction_count} 笔 · 占比 {((report.variable_expenses / report.total_expenses) * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                {report.month_over_month_percentage && report.month_over_month_percentage > 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm">环比变化</span>
              </div>
              <div className={`text-2xl font-bold ${
                report.month_over_month_percentage && report.month_over_month_percentage > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {report.month_over_month_percentage
                  ? formatPercentage(report.month_over_month_percentage)
                  : '-'}
              </div>
              {report.month_over_month_change !== null && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {report.month_over_month_change > 0 ? '+' : ''}¥{formatCurrency(report.month_over_month_change)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 支出结构分析 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 固定 vs 可变支出 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                支出结构
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={expenseTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    >
                      {expenseTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `¥${formatCurrency(value)}`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 分类统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                分类统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `¥${formatCurrency(value)}`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 固定支出明细 */}
        {report.fixed_expenses_breakdown.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                固定支出明细
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.fixed_expenses_breakdown.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {getCategoryName(item.category)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-orange-700 dark:text-orange-300">
                        ¥{formatCurrency(item.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分类明细 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>分类明细</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.category_breakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[item.category.toLowerCase()] || '#6b7280' }}
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      {getCategoryName(item.category)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      ¥{formatCurrency(item.amount)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {item.count}笔 · {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 商家和支付方式 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 常去商家 */}
          {report.top_merchants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  常去商家 TOP 10
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.top_merchants.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 w-6">{index + 1}</span>
                        <span className="text-gray-700 dark:text-gray-300">{item.merchant}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          ¥{formatCurrency(item.amount)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.count}笔
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 支付方式统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                支付方式统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.payment_method_stats.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">
                      {getPaymentMethodName(item.method)}
                    </span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        ¥{formatCurrency(item.amount)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.count}笔 · {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 日均支出 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              日均数据
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">日均支出</div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  ¥{report.average_daily_expense ? formatCurrency(report.average_daily_expense) : '-'}
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">单笔均价</div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  ¥{report.average_transaction ? formatCurrency(report.average_transaction) : '-'}
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">日均可变支出</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  ¥{formatCurrency(report.variable_expenses / new Date(report.year, report.month, 0).getDate())}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI 洞察 */}
        {report.ai_insights && (
          <Card>
            <CardHeader>
              <CardTitle>AI 分析洞察</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                {report.ai_insights}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
