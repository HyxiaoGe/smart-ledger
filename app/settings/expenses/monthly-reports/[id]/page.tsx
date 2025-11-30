'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { monthlyReportsApi, type MonthlyReport } from '@/lib/api/services/monthly-reports';
import { paymentMethodsApi } from '@/lib/api/services/payment-methods';
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
  BarChart3,
  Utensils,
  Coffee,
  Car,
  ShoppingBag,
  Gamepad2,
  Package,
  Home,
  Stethoscope,
  GraduationCap,
  Smartphone,
  Zap,
  MoreHorizontal
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

// 分类颜色 - 更丰富的配色
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
  rent: '#a855f7',
  utilities: '#0ea5e9',
  other: '#6b7280',
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#a855f7', '#0ea5e9'];

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
  rent: '房租',
  utilities: '水电费',
  other: '其他',
};

// 分类图标映射
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  food: <Utensils className="h-4 w-4" />,
  drink: <Coffee className="h-4 w-4" />,
  transport: <Car className="h-4 w-4" />,
  shopping: <ShoppingBag className="h-4 w-4" />,
  entertainment: <Gamepad2 className="h-4 w-4" />,
  daily: <Package className="h-4 w-4" />,
  housing: <Home className="h-4 w-4" />,
  medical: <Stethoscope className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  subscription: <Smartphone className="h-4 w-4" />,
  rent: <Home className="h-4 w-4" />,
  utilities: <Zap className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

// 支付方式名称映射（用于静态映射）
const PAYMENT_METHOD_NAMES: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  cash: '现金',
  card: '银行卡',
  creditcard: '信用卡',
  debitcard: '借记卡',
  '未指定': '未指定',
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

function getCategoryIcon(category: string): React.ReactNode {
  return CATEGORY_ICONS[category.toLowerCase()] || <MoreHorizontal className="h-4 w-4" />;
}

export default function MonthlyReportDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // 获取报告数据
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['monthly-reports', id],
    queryFn: () => monthlyReportsApi.getById(id),
  });

  // 获取支付方式列表用于ID到名称的映射
  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.getAll(),
  });

  // 创建支付方式ID到名称的映射
  const getPaymentMethodName = (methodId: string): string => {
    // 先尝试从支付方式列表中查找
    if (paymentMethods) {
      const method = paymentMethods.find(m => m.id === methodId);
      if (method) return method.name;
    }
    // 再尝试静态映射
    const staticName = PAYMENT_METHOD_NAMES[methodId.toLowerCase()];
    if (staticName) return staticName;
    // 如果是UUID格式，返回"未知支付方式"
    if (methodId.includes('-') && methodId.length > 30) return '未知支付方式';
    return methodId;
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses/monthly-reports">
            <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-800/50">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回月报告列表
            </Button>
          </Link>
        </div>

        {/* 页面标题 - 带渐变背景 */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8" />
            <h2 className="text-3xl font-bold">
              {formatMonthDisplay(report.year, report.month)}
            </h2>
          </div>
          <p className="text-blue-100 text-sm">
            月度财务报告 · 生成于 {new Date(report.generated_at).toLocaleString('zh-CN')}
          </p>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* 总支出 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow border-0 bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium">总支出</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ¥{formatCurrency(report.total_expenses)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {report.transaction_count} 笔交易
              </div>
            </CardContent>
          </Card>

          {/* 固定支出 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-3">
                <div className="w-8 h-8 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
                  <Lock className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">固定支出</span>
              </div>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                ¥{formatCurrency(report.fixed_expenses)}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                {report.fixed_transaction_count} 笔 · {((report.fixed_expenses / report.total_expenses) * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          {/* 可变支出 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                  <Unlock className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">可变支出</span>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                ¥{formatCurrency(report.variable_expenses)}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-2">
                {report.variable_transaction_count} 笔 · {((report.variable_expenses / report.total_expenses) * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          {/* 环比变化 */}
          <Card className={`shadow-md hover:shadow-lg transition-shadow border-0 ${
            report.month_over_month_percentage && report.month_over_month_percentage > 0
              ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900'
              : 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  report.month_over_month_percentage && report.month_over_month_percentage > 0
                    ? 'bg-red-200 dark:bg-red-800'
                    : 'bg-emerald-200 dark:bg-emerald-800'
                }`}>
                  {report.month_over_month_percentage && report.month_over_month_percentage > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  report.month_over_month_percentage && report.month_over_month_percentage > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>环比变化</span>
              </div>
              <div className={`text-2xl font-bold ${
                report.month_over_month_percentage && report.month_over_month_percentage > 0
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}>
                {report.month_over_month_percentage
                  ? formatPercentage(report.month_over_month_percentage)
                  : '-'}
              </div>
              {report.month_over_month_change !== null && (
                <div className={`text-sm mt-2 ${
                  report.month_over_month_percentage && report.month_over_month_percentage > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {report.month_over_month_change > 0 ? '+' : ''}¥{formatCurrency(Math.abs(report.month_over_month_change))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 支出结构分析 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 固定 vs 可变支出 */}
          <Card className="shadow-md border-0 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <PieChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
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
              {/* 图例 */}
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">固定支出</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">可变支出</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 分类统计饼图 */}
          <Card className="shadow-md border-0 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                分类占比
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
                      label={({ name, percentage }) => percentage > 5 ? `${name}` : ''}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `¥${formatCurrency(value)}`} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 固定支出明细 */}
        {report.fixed_expenses_breakdown.length > 0 && (
          <Card className="mb-8 shadow-md border-0 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                固定支出明细
                <span className="ml-auto text-sm font-normal text-gray-500 dark:text-gray-400">
                  共 {report.fixed_expenses_breakdown.length} 项
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.fixed_expenses_breakdown.map((item, index) => {
                  const color = CATEGORY_COLORS[item.category.toLowerCase()] || '#6b7280';
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30 rounded-xl border border-orange-200/50 dark:border-orange-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {getCategoryName(item.category)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-orange-600 dark:text-orange-400">
                          ¥{formatCurrency(item.amount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分类明细 */}
        <Card className="mb-8 shadow-md border-0 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              分类明细
              <span className="ml-auto text-sm font-normal text-gray-500 dark:text-gray-400">
                共 {report.category_breakdown.length} 个分类
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.category_breakdown.map((item, index) => {
                const color = CATEGORY_COLORS[item.category.toLowerCase()] || '#6b7280';
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {getCategoryName(item.category)}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.count}笔交易
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          ¥{formatCurrency(item.amount)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    {/* 进度条 */}
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 商家和支付方式 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 常去商家 */}
          {report.top_merchants.length > 0 && (
            <Card className="shadow-md border-0 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <Store className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  常去商家
                  <span className="ml-auto text-sm font-normal text-gray-500 dark:text-gray-400">
                    TOP {Math.min(10, report.top_merchants.length)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.top_merchants.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < 3
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{item.merchant}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          ¥{formatCurrency(item.amount)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
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
          <Card className="shadow-md border-0 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                支付方式统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.payment_method_stats.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {getPaymentMethodName(item.method)}
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          ¥{formatCurrency(item.amount)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {item.count}笔
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 日均支出 */}
        <Card className="mb-8 shadow-md border-0 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              日均数据
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-2 font-medium">日均支出</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  ¥{report.average_daily_expense ? formatCurrency(report.average_daily_expense) : '-'}
                </div>
              </div>
              <div className="text-center p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-xl">
                <div className="text-sm text-purple-600 dark:text-purple-400 mb-2 font-medium">单笔均价</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  ¥{report.average_transaction ? formatCurrency(report.average_transaction) : '-'}
                </div>
              </div>
              <div className="text-center p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-xl">
                <div className="text-sm text-green-600 dark:text-green-400 mb-2 font-medium">日均可变支出</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  ¥{formatCurrency(report.variable_expenses / new Date(report.year, report.month, 0).getDate())}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI 洞察 */}
        {report.ai_insights && (
          <Card className="shadow-md border-0 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                  <span className="text-lg">✨</span>
                </div>
                AI 分析洞察
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                {report.ai_insights}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
