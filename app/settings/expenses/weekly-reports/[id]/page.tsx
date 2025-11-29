'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ChevronLeft,
  TrendingDown,
  TrendingUp,
  DollarSign,
  FileText,
  Sparkles,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Store,
  Lightbulb,
  TrendingDownIcon,
  ShoppingBag,
  CreditCard,
  AlertCircle
} from 'lucide-react';
// 周报告类型定义
interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

interface MerchantStat {
  merchant: string;
  amount: number;
  count: number;
}

interface PaymentMethodStat {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

interface WeeklyReport {
  id: string;
  user_id: string | null;
  week_start_date: string;
  week_end_date: string;
  total_expenses: number;
  transaction_count: number;
  average_transaction: number;
  category_breakdown: CategoryStat[];
  top_merchants: MerchantStat[];
  payment_method_stats: PaymentMethodStat[];
  week_over_week_change: number;
  week_over_week_percentage: number;
  ai_insights: string | null;
  generated_at: string;
  generation_type: 'auto' | 'manual';
}

// API 调用函数
async function fetchWeeklyReportById(id: string): Promise<WeeklyReport | null> {
  const response = await fetch(`/api/weekly-reports/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('获取周报告失败');
  const { data } = await response.json();
  return data;
}

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

const CATEGORY_MAP: Record<string, string> = {
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

const PAYMENT_METHOD_MAP: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  cash: '现金',
  card: '银行卡',
  creditcard: '信用卡',
  debitcard: '借记卡',
  '未指定': '其他',
};

function getCategoryName(category: string): string {
  return CATEGORY_MAP[category.toLowerCase()] || category;
}

function getPaymentMethodName(method: string): string {
  return PAYMENT_METHOD_MAP[method.toLowerCase()] || method;
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
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function WeeklyReportDetailPage() {
  const params = useParams();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [params.id]);

  async function loadReport() {
    try {
      setLoading(true);
      const data = await fetchWeeklyReportById(params.id as string);
      setReport(data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
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

  if (!report) {
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

  const changeAmount = Math.abs(report.week_over_week_change);

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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {getWeekDescription(report.week_start_date)}
            </h2>
            <span className="text-lg text-gray-500 dark:text-gray-400">
              {formatWeekRange(report.week_start_date, report.week_end_date)}
            </span>
            {report.generation_type === 'manual' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                手动生成
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            本周消费数据分析与洞察
          </p>
        </div>

        {/* 核心统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  总支出
                </CardTitle>
                <DollarSign className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ¥{formatCurrency(report.total_expenses)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                平均每笔 ¥{formatCurrency(report.average_transaction)}
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
                {report.transaction_count}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                本周累计消费记录
              </p>
            </CardContent>
          </Card>

          <Card className={`${
            report.week_over_week_percentage > 0
              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
              : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-sm font-medium ${
                  report.week_over_week_percentage > 0
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-green-700 dark:text-green-300'
                }`}>
                  较上周
                </CardTitle>
                {report.week_over_week_percentage > 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className={`text-2xl font-bold ${
                report.week_over_week_percentage > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {formatPercentage(report.week_over_week_percentage)}
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-xs ${
                report.week_over_week_percentage > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                消费增减百分比
              </p>
            </CardContent>
          </Card>

          <Card className={`${
            report.week_over_week_percentage > 0
              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
              : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-sm font-medium ${
                  report.week_over_week_percentage > 0
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-green-700 dark:text-green-300'
                }`}>
                  增减金额
                </CardTitle>
                {report.week_over_week_percentage > 0 ? (
                  <ArrowUpCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className={`text-2xl font-bold ${
                report.week_over_week_percentage > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {report.week_over_week_percentage > 0 ? '+' : '-'}
                ¥{formatCurrency(changeAmount)}
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-xs ${
                report.week_over_week_percentage > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                省下 / 多花了多少钱
              </p>
            </CardContent>
          </Card>
        </div>

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

          {/* 概览 Tab */}
          <TabsContent value="overview">
            <div className="space-y-8">
              {/* 消费健康度评分 */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <Sparkles className="h-5 w-5" />
                    消费健康度评分
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // 计算健康度分数
                    let score = 100;
                    const reasons: string[] = [];

                    // 1. 消费稳定性（40分）- 波动过大扣分
                    const changePercent = Math.abs(report.week_over_week_percentage);
                    if (changePercent > 50) {
                      score -= 40;
                      reasons.push(`消费波动较大 (${formatPercentage(changePercent)})`);
                    } else if (changePercent > 30) {
                      score -= 20;
                      reasons.push(`消费有所波动 (${formatPercentage(changePercent)})`);
                    } else if (changePercent > 15) {
                      score -= 10;
                    }

                    // 2. 类别分布合理性（30分）- 过于集中扣分
                    if (report.category_breakdown.length > 0) {
                      const maxCategoryPercent = Math.max(...report.category_breakdown.map(c => c.percentage));
                      if (maxCategoryPercent > 70) {
                        score -= 30;
                        reasons.push('消费过于集中在单一类别');
                      } else if (maxCategoryPercent > 50) {
                        score -= 15;
                        reasons.push('建议分散消费类别');
                      }
                    }

                    // 3. 交易频率合理性（30分）- 过少或过多扣分
                    const avgPerTransaction = report.average_transaction;
                    if (report.transaction_count < 5) {
                      score -= 20;
                      reasons.push('交易笔数较少，建议增加记账频率');
                    } else if (avgPerTransaction < 10) {
                      score -= 10;
                      reasons.push('平均每笔金额偏低');
                    }

                    // 确保分数在 0-100 之间
                    score = Math.max(0, Math.min(100, score));

                    // 根据分数确定等级和颜色
                    let grade = '';
                    let gradeColor = '';
                    let emoji = '';
                    if (score >= 90) {
                      grade = '优秀';
                      gradeColor = 'text-green-600 dark:text-green-400';
                      emoji = '🎉';
                    } else if (score >= 75) {
                      grade = '良好';
                      gradeColor = 'text-blue-600 dark:text-blue-400';
                      emoji = '👍';
                    } else if (score >= 60) {
                      grade = '一般';
                      gradeColor = 'text-yellow-600 dark:text-yellow-400';
                      emoji = '😐';
                    } else {
                      grade = '需改进';
                      gradeColor = 'text-red-600 dark:text-red-400';
                      emoji = '⚠️';
                    }

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-6xl">{emoji}</div>
                            <div>
                              <div className={`text-4xl font-bold ${gradeColor}`}>
                                {score}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                综合评分
                              </div>
                            </div>
                          </div>
                          <div className={`text-2xl font-semibold ${gradeColor}`}>
                            {grade}
                          </div>
                        </div>

                        {/* 进度条 */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              score >= 90
                                ? 'bg-green-500'
                                : score >= 75
                                ? 'bg-blue-500'
                                : score >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>

                        {/* 改进建议 */}
                        {reasons.length > 0 && (
                          <div className="mt-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                              改进建议：
                            </h4>
                            <ul className="space-y-1">
                              {reasons.map((reason, index) => (
                                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                  <span className="text-blue-500 mt-0.5">•</span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* 类别分布 */}
              <Card>
                <CardHeader>
                  <CardTitle>消费类别分布</CardTitle>
                </CardHeader>
                <CardContent>
                  {report.category_breakdown.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>暂无分类数据</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {report.category_breakdown.map((cat, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {getCategoryName(cat.category)}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {cat.count} 笔
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              ¥{formatCurrency(cat.amount)}
                            </span>
                            <span className="text-sm text-purple-600 dark:text-purple-400 w-12 text-right">
                              {cat.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 图表 Tab */}
          <TabsContent value="charts">
            <div className="space-y-8">
              {/* 上半部分：饼图 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 类别分布饼图 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-500" />
                      消费类别分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.category_breakdown.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>暂无分类数据</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={report.category_breakdown.map(cat => ({
                              name: getCategoryName(cat.category),
                              value: Number(cat.amount),
                              percentage: cat.percentage
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {report.category_breakdown.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={[
                                '#9333ea', '#ec4899', '#f59e0b', '#10b981',
                                '#3b82f6', '#8b5cf6', '#f43f5e', '#14b8a6'
                              ][index % 8]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => `¥${formatCurrency(value)}`}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* 支付方式环形图 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-500" />
                      支付方式分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.payment_method_stats.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>暂无支付方式数据</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={report.payment_method_stats.map(method => ({
                              name: getPaymentMethodName(method.method),
                              value: Number(method.amount),
                              percentage: method.percentage
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {report.payment_method_stats.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={[
                                '#3b82f6', '#06b6d4', '#0ea5e9', '#60a5fa',
                                '#38bdf8', '#7dd3fc'
                              ][index % 6]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => `¥${formatCurrency(value)}`}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 下半部分：商家横向柱状图 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-purple-500" />
                    TOP 5 消费商户
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.top_merchants.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>暂无商户数据</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={report.top_merchants.slice(0, 5).map((merchant, index) => ({
                          name: merchant.merchant,
                          amount: Number(merchant.amount),
                          count: merchant.count,
                          rank: index + 1
                        }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => `¥${(value / 1000).toFixed(1)}k`}
                          tick={{ fill: 'currentColor' }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={90}
                          tick={{ fill: 'currentColor' }}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === 'amount') {
                              return [`¥${formatCurrency(value)}`, '消费金额'];
                            }
                            return [value, '消费笔数'];
                          }}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="amount" fill="#9333ea" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 商家 Tab */}
          <TabsContent value="merchants">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* TOP 5 商户 */}
              <Card>
                <CardHeader>
                  <CardTitle>TOP 5 消费商户</CardTitle>
                </CardHeader>
                <CardContent>
                  {report.top_merchants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>暂无商户数据</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {report.top_merchants.slice(0, 5).map((merchant, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                              : index === 1
                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              : index === 2
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {merchant.merchant}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {merchant.count} 笔消费
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          ¥{formatCurrency(merchant.amount)}
                        </span>
                      </div>
                    ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 支付方式统计 */}
              <Card>
                <CardHeader>
                  <CardTitle>支付方式统计</CardTitle>
                </CardHeader>
                <CardContent>
                  {report.payment_method_stats.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>暂无支付方式数据</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {report.payment_method_stats.map((method, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {getPaymentMethodName(method.method)}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {method.count} 笔
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              ¥{formatCurrency(method.amount)}
                            </span>
                            <span className="text-sm text-blue-600 dark:text-blue-400 w-12 text-right">
                              {method.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${method.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 洞察 Tab */}
          <TabsContent value="insights">
            <div className="space-y-8">
              {/* AI 智能洞察 */}
              {report.ai_insights && (
                <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <CardTitle className="text-purple-900 dark:text-purple-100">AI 智能洞察</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                      {report.ai_insights}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* 关键发现 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 最大单笔消费 */}
                {(() => {
                  const maxTransaction = report.category_breakdown.reduce((max, cat) =>
                    cat.amount > (max?.amount || 0) ? cat : max, report.category_breakdown[0]
                  );
                  return maxTransaction && (
                    <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <CardTitle className="text-sm">最大支出类别</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            ¥{formatCurrency(maxTransaction.amount)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {getCategoryName(maxTransaction.category)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            占比 {maxTransaction.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* 消费集中度 */}
                {(() => {
                  const maxCategoryPercent = report.category_breakdown.length > 0
                    ? Math.max(...report.category_breakdown.map(c => c.percentage))
                    : 0;
                  const isConcentrated = maxCategoryPercent > 50;
                  return (
                    <Card className={`bg-gradient-to-br ${
                      isConcentrated
                        ? 'from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 border-yellow-200 dark:border-yellow-800'
                        : 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800'
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <BarChart3 className={`h-5 w-5 ${
                            isConcentrated
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                          }`} />
                          <CardTitle className="text-sm">消费集中度</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className={`text-2xl font-bold ${
                            isConcentrated
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {maxCategoryPercent.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {isConcentrated ? '较为集中' : '分布均衡'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {isConcentrated ? '建议分散消费' : '消费结构健康'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* 支付习惯 */}
                {(() => {
                  const mostUsedMethod = report.payment_method_stats.length > 0
                    ? report.payment_method_stats.reduce((max, method) =>
                        method.count > (max?.count || 0) ? method : max, report.payment_method_stats[0]
                      )
                    : null;
                  return mostUsedMethod && (
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <CardTitle className="text-sm">常用支付方式</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {mostUsedMethod.count} 笔
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {getPaymentMethodName(mostUsedMethod.method)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            占比 {mostUsedMethod.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>

              {/* 消费行为分析 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    消费行为分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">交易频次</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">平均每天</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          {(report.transaction_count / 7).toFixed(1)} 笔
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {report.transaction_count < 5 ? '偏少' : report.transaction_count > 20 ? '较多' : '正常'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">单笔均额</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">平均每笔消费</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          ¥{formatCurrency(report.average_transaction)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {report.average_transaction < 20 ? '小额为主' : report.average_transaction > 100 ? '大额为主' : '中等金额'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">高频商家</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">消费超过 2 次</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          {report.top_merchants.filter(m => m.count >= 2).length} 家
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {report.top_merchants.filter(m => m.count >= 2).length > 0
                            ? report.top_merchants.filter(m => m.count >= 2).slice(0, 2).map(m => m.merchant).join('、')
                            : '无'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 环比对比分析 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDownIcon className="h-5 w-5 text-blue-500" />
                    环比对比分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">总体趋势</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">较上周</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${
                          report.week_over_week_percentage > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {formatPercentage(report.week_over_week_percentage)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.abs(report.week_over_week_percentage) < 10 ? '变化平稳' :
                           Math.abs(report.week_over_week_percentage) < 30 ? '有所波动' : '波动较大'}
                        </p>
                      </div>
                    </div>

                    <div className="py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">健康度评价</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {report.week_over_week_percentage > 30 && '本周消费增长较快，建议关注支出是否合理。'}
                        {report.week_over_week_percentage > 0 && report.week_over_week_percentage <= 30 && '本周消费略有增长，整体在可控范围内。'}
                        {report.week_over_week_percentage < 0 && report.week_over_week_percentage >= -30 && '本周消费有所下降，保持良好消费习惯。'}
                        {report.week_over_week_percentage < -30 && '本周消费大幅下降，支出控制效果显著。'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 智能建议 */}
              <Card className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                    <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />
                    智能建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {(() => {
                      const suggestions: string[] = [];

                      // 基于类别分布
                      const maxCategoryPercent = report.category_breakdown.length > 0
                        ? Math.max(...report.category_breakdown.map(c => c.percentage))
                        : 0;
                      if (maxCategoryPercent > 50) {
                        suggestions.push('您的消费过于集中在单一类别，建议适当分散消费，保持支出均衡。');
                      }

                      // 基于环比变化
                      if (report.week_over_week_percentage > 30) {
                        suggestions.push('本周支出环比增长超过 30%，建议检查是否有大额非必要支出。');
                      }

                      // 基于交易频次
                      if (report.transaction_count < 5) {
                        suggestions.push('记账频次较低，建议提高记账积极性，完整记录每日消费。');
                      }

                      // 基于单笔均额
                      if (report.average_transaction < 10) {
                        suggestions.push('单笔消费金额偏低，可考虑合并小额支出记录，提升记账效率。');
                      }

                      // 基于高频商家
                      const frequentMerchants = report.top_merchants.filter(m => m.count >= 3);
                      if (frequentMerchants.length > 0) {
                        suggestions.push(`您经常在 ${frequentMerchants[0].merchant} 消费，可以考虑办理会员卡获得优惠。`);
                      }

                      // 如果没有任何建议
                      if (suggestions.length === 0) {
                        suggestions.push('您的消费习惯良好，保持当前的消费模式即可。');
                        suggestions.push('建议继续保持记账习惯，定期回顾消费情况。');
                      }

                      return suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-3 text-gray-700 dark:text-gray-200">
                          <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <span>{suggestion}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* 报告元数据 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>生成时间: {new Date(report.generated_at).toLocaleString('zh-CN')}</span>
              </div>
              <div>
                生成方式: {report.generation_type === 'auto' ? '自动生成' : '手动生成'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
