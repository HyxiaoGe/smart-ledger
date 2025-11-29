'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import {
  getCurrentYearMonth,
  formatMonth,
  getProgressBarColor,
} from '@/lib/services/budgetService.server';

// 类型定义 (从 budgetService.server.ts 复用)
interface TotalBudgetSummary {
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  usage_percentage: number;
  category_budgets_count: number;
  over_budget_count: number;
  near_limit_count: number;
}

interface BudgetPrediction {
  current_spending: number;
  daily_rate: number;
  predicted_total: number;
  days_passed: number;
  days_remaining: number;
  will_exceed_budget: boolean;
  predicted_overage?: number;
}

interface BudgetSuggestion {
  categoryKey: string;
  suggestedAmount: number;
  confidenceLevel: string;
  reason: string;
  historicalAvg: number;
  historicalMonths: number;
  currentMonthSpending: number;
  currentDailyRate: number;
  predictedMonthTotal: number;
  trendDirection: string;
  daysIntoMonth: number;
  calculatedAt: string;
}
import type { Category } from '@/types/dto/category.dto';

// API 调用函数
async function fetchCategoriesWithStats(): Promise<Category[]> {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('获取分类失败');
  const { data } = await response.json();
  return data;
}
import {
  ChevronLeft,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  PiggyBank,
} from 'lucide-react';

export default function BudgetPage() {
  const { year, month } = getCurrentYearMonth();
  const [summary, setSummary] = useState<TotalBudgetSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Map<string, BudgetPrediction>>(new Map());
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 使用 API 路由获取数据
      const [summaryRes, categoriesData, suggestionsRes] = await Promise.all([
        fetch(`/api/budgets/summary?year=${year}&month=${month}&currency=CNY`).then(r => r.json()),
        fetchCategoriesWithStats(),
        fetch(`/api/budgets/suggestions?year=${year}&month=${month}`).then(r => r.json()),
      ]);

      setSummary(summaryRes);
      setCategories(categoriesData.filter(c => c.is_active));
      setSuggestions(suggestionsRes);

      // 获取每个分类建议的月底预测
      const predictionMap = new Map<string, BudgetPrediction>();

      await Promise.all(
        suggestionsRes.map(async (suggestion: BudgetSuggestion) => {
          if (suggestion.categoryKey) {
            const predictionRes = await fetch('/api/budgets/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                categoryKey: suggestion.categoryKey,
                year,
                month,
                budgetAmount: suggestion.suggestedAmount,
                currency: 'CNY'
              })
            });

            if (predictionRes.ok) {
              const prediction = await predictionRes.json();
              predictionMap.set(suggestion.categoryKey, prediction);
            }
          }
        })
      );

      setPredictions(predictionMap);
    } catch (error) {
      console.error('获取预算数据失败:', error);
      setToastMessage('❌ 获取数据失败');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  
  const totalBudget = summary?.total_budget || 0;
  const totalSpent = summary?.total_spent || 0;
  const totalRemaining = summary?.total_remaining || 0;
  const usagePercentage = summary?.usage_percentage || 0;

  if (loading) {
    return <PageSkeleton stats={4} listItems={0} />;
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

        {/* 页面标题和月份 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">月度预算设置</h2>
            <p className="text-gray-600 dark:text-gray-300">管理您的月度预算，控制支出更轻松</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <Calendar className="inline h-4 w-4 mr-2 text-blue-600" />
              <span className="font-semibold text-blue-900 dark:text-blue-100">{formatMonth(year, month)}</span>
            </div>
          </div>
        </div>

        {/* 总预算汇总卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-blue-100 mb-1">总预算</div>
                  <div className="text-3xl font-bold">¥{totalBudget.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <PiggyBank className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">已支出</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ¥{totalSpent.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">剩余</div>
                  <div className="text-2xl font-bold text-green-600">
                    ¥{totalRemaining.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm text-gray-600 mb-1">使用率</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{usagePercentage.toFixed(1)}%</div>
                </div>
                <div className={`p-3 rounded-lg ${usagePercentage > 100 ? 'bg-red-50 dark:bg-red-950' : usagePercentage >= 80 ? 'bg-orange-50 dark:bg-orange-950' : 'bg-green-50 dark:bg-green-950'}`}>
                  {usagePercentage > 100 ? (
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  ) : usagePercentage >= 80 ? (
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressBarColor(usagePercentage, usagePercentage > 100)}`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 预算警告 */}
        {summary && (summary.over_budget_count > 0 || summary.near_limit_count > 0) && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950 border-l-4 border-orange-500 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-900">
                {summary.over_budget_count > 0 && (
                  <p className="font-semibold">⚠️ {summary.over_budget_count} 个类别预算已超支</p>
                )}
                {summary.near_limit_count > 0 && (
                  <p>⚡ {summary.near_limit_count} 个类别预算接近上限</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 智能预算建议 */}
        {suggestions.length > 0 && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 mb-8">
            <CardHeader className="cursor-pointer" onClick={() => setIsSuggestionsExpanded(!isSuggestionsExpanded)}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
                  <span>💡</span>
                  <span>智能预算管理</span>
                  <span className="text-xs font-normal text-purple-600 dark:text-purple-300">
                    基于历史消费数据分析 ({suggestions.length} 个类别)
                  </span>
                </CardTitle>
                {isSuggestionsExpanded ? (
                  <ChevronUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                )}
              </div>
            </CardHeader>
            {isSuggestionsExpanded && (
              <CardContent className="space-y-3">
              {suggestions.map((suggestion) => {
                const category = categories.find(c => c.key === suggestion.categoryKey);
                if (!category) return null;

                const confidenceColor =
                  suggestion.confidenceLevel === 'high' ? 'text-orange-600 bg-orange-100 dark:bg-orange-900' :
                  suggestion.confidenceLevel === 'medium' ? 'text-blue-600 bg-blue-100 dark:bg-blue-900' :
                  'text-gray-600 bg-gray-100 dark:bg-gray-700';

                const confidenceLabel =
                  suggestion.confidenceLevel === 'high' ? '高' :
                  suggestion.confidenceLevel === 'medium' ? '中' :
                  '低';

                // 计算趋势图标
                const trendIcon =
                  suggestion.predictedMonthTotal > suggestion.historicalAvg * 1.1 ? '↑' :
                  suggestion.predictedMonthTotal < suggestion.historicalAvg * 0.9 ? '↓' :
                  '~';

                const trendColor =
                  trendIcon === '↑' ? 'text-red-500' :
                  trendIcon === '↓' ? 'text-green-500' :
                  'text-gray-500';

                return (
                  <div
                    key={suggestion.categoryKey}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{category.icon}</div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {category.label}
                          </div>
                          {/* AI建议预算 - 恢复原来的格式 */}
                          <div className="mb-3">
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="text-purple-600 dark:text-purple-400">💡</span>
                                <span className="text-gray-500 dark:text-gray-400">建议:</span>
                              </div>
                              <span className="font-bold text-purple-700 dark:text-purple-300 text-base">
                                ¥{suggestion.suggestedAmount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* 可信度标签放在右侧 */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">可信度:</span>
                        <div className="relative group">
                          <span className={`text-xs px-2 py-1 rounded-full ${confidenceColor} cursor-help`}>
                            {confidenceLabel}
                          </span>
                          {/* Tooltip 解释 */}
                          <div className="absolute right-0 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                            {confidenceLabel === '高' ? '基于充足的历史数据，预测准确度很高' :
                             confidenceLabel === '中' ? '基于一定的历史数据，预测准确度一般' :
                             '历史数据不足，预测准确度较低'}
                          </div>
                        </div>
                      </div>
                    </div>

                    
                    {/* 进度条和使用情况 */}
                    <div className="mb-3">
                      {/* 使用率 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">使用率</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {Math.min(100, (suggestion.currentMonthSpending / suggestion.suggestedAmount) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              (suggestion.currentMonthSpending / suggestion.suggestedAmount) > 1 ? 'bg-red-500' :
                              (suggestion.currentMonthSpending / suggestion.suggestedAmount) >= 0.8 ? 'bg-orange-500' :
                              (suggestion.currentMonthSpending / suggestion.suggestedAmount) >= 0.5 ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, (suggestion.currentMonthSpending / suggestion.suggestedAmount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {/* 参考数据 - 紧凑单行显示 */}
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-4">
                        <span>📅 历史平均: ¥{suggestion.historicalAvg.toLocaleString()}</span>
                        <span>
                          🤖 {suggestion.reason.split('**').join('')}
                        </span>
                        <span>💰 当月已支出: ¥{suggestion.currentMonthSpending.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🔮 当月预测支出: ¥{suggestion.predictedMonthTotal.toLocaleString()}</span>
                        <span className={`font-bold ${trendColor}`}>{trendIcon}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              </CardContent>
            )}
          </Card>
        )}

        
        
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

