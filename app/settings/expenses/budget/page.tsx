'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import {
  getCurrentYearMonth,
  formatMonth,
  getProgressBarColor
} from '@/lib/services/budgetService.server';
import { budgetsApi } from '@/lib/api/services/budgets';
import { categoriesApi } from '@/lib/api/services/categories';
import type { Category } from '@/types/dto/category.dto';
import {
  ChevronLeft,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  PiggyBank
} from 'lucide-react';

export default function BudgetPage() {
  const { year, month } = getCurrentYearMonth();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(true);
  const [suggestionFilter, setSuggestionFilter] = useState<'all' | 'over' | 'near' | 'low'>('all');
  const [suggestionSort, setSuggestionSort] = useState<'usage' | 'risk' | 'amount'>('usage');
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  // 获取预算汇总
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError
  } = useQuery({
    queryKey: ['budget-summary', year, month],
    queryFn: () => budgetsApi.getSummary({ year, month, currency: 'CNY' })
  });

  // 获取分类列表
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list()
  });

  // 获取预算建议（已包含实时计算的当月支出数据）
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ['budget-suggestions', year, month],
    queryFn: () => budgetsApi.getSuggestions({ year, month })
  });

  // 过滤活跃分类
  const categories = useMemo(
    () => (categoriesData || []).filter((c) => c.is_active) as Category[],
    [categoriesData]
  );

  useEffect(() => {
    if (summaryError && !showToast) {
      setToastMessage('❌ 获取数据失败');
      setShowToast(true);
    }
  }, [summaryError, showToast]);

  const loading = summaryLoading || categoriesLoading || suggestionsLoading;
  const totalBudget = summary?.total_budget || 0;
  const totalSpent = summary?.total_spent || 0;
  const totalRemaining = summary?.total_remaining || 0;
  const usagePercentage = summary?.usage_percentage || 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysIntoMonth = new Date().getDate();
  const remainingDays = Math.max(1, daysInMonth - daysIntoMonth + 1);
  const dailyAvailable = totalRemaining > 0 ? totalRemaining / remainingDays : 0;

  const getUsagePercent = (spending: number, budget: number) => {
    if (!budget || budget <= 0) return 0;
    return (spending / budget) * 100;
  };

  const filteredSuggestions = useMemo(() => {
    return suggestions
      .map((suggestion) => {
        const usagePercent = getUsagePercent(
          suggestion.currentMonthSpending,
          suggestion.suggestedAmount
        );
        const riskRatio =
          suggestion.suggestedAmount > 0
            ? suggestion.predictedMonthTotal / suggestion.suggestedAmount
            : 0;
        return { suggestion, usagePercent, riskRatio };
      })
      .filter(({ usagePercent }) => {
        if (suggestionFilter === 'over') return usagePercent > 100;
        if (suggestionFilter === 'near') return usagePercent >= 80 && usagePercent <= 100;
        if (suggestionFilter === 'low') return usagePercent < 50;
        return true;
      })
      .sort((a, b) => {
        if (suggestionSort === 'amount') {
          return b.suggestion.suggestedAmount - a.suggestion.suggestedAmount;
        }
        if (suggestionSort === 'risk') {
          return b.riskRatio - a.riskRatio;
        }
        return b.usagePercent - a.usagePercent;
      });
  }, [suggestions, suggestionFilter, suggestionSort]);

  if (loading) {
    return <PageSkeleton stats={4} listItems={0} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-100"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回消费配置
            </Button>
          </Link>
        </div>

        {/* 页面标题和月份 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              月度预算设置
            </h2>
            <p className="text-gray-600 dark:text-gray-300">管理您的月度预算，控制支出更轻松</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <Calendar className="inline h-4 w-4 mr-2 text-blue-600" />
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                {formatMonth(year, month)}
              </span>
            </div>
          </div>
        </div>

        {/* 总预算汇总卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">日均可用</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ¥{dailyAvailable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">剩余 {remainingDays} 天</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm text-gray-600 mb-1">使用率</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {usagePercentage.toFixed(1)}%
                  </div>
                </div>
                <div
                  className={`p-3 rounded-lg ${usagePercentage > 100 ? 'bg-red-50 dark:bg-red-950' : usagePercentage >= 80 ? 'bg-orange-50 dark:bg-orange-950' : 'bg-green-50 dark:bg-green-950'}`}
                >
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
            <CardHeader
              className="cursor-pointer"
              onClick={() => setIsSuggestionsExpanded(!isSuggestionsExpanded)}
            >
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
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { value: 'all' as const, label: '全部' },
                    { value: 'over' as const, label: '超支' },
                    { value: 'near' as const, label: '接近上限' },
                    { value: 'low' as const, label: '低使用' }
                  ].map((item) => (
                    <Button
                      key={item.value}
                      size="sm"
                      variant={suggestionFilter === item.value ? 'default' : 'outline'}
                      onClick={() => setSuggestionFilter(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                  <div className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>排序</span>
                    <select
                      value={suggestionSort}
                      onChange={(event) =>
                        setSuggestionSort(event.target.value as typeof suggestionSort)
                      }
                      className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-sm"
                    >
                      <option value="usage">使用率</option>
                      <option value="risk">预测风险</option>
                      <option value="amount">建议金额</option>
                    </select>
                  </div>
                </div>
                {filteredSuggestions.map(({ suggestion, usagePercent }) => {
                  const category = categories.find((c) => c.key === suggestion.categoryKey);
                  if (!category) return null;

                  const confidenceColor =
                    suggestion.confidenceLevel === 'high'
                      ? 'text-orange-600 bg-orange-100 dark:bg-orange-900'
                      : suggestion.confidenceLevel === 'medium'
                        ? 'text-blue-600 bg-blue-100 dark:bg-blue-900'
                        : 'text-gray-600 bg-gray-100 dark:bg-gray-700';

                  const confidenceLabel =
                    suggestion.confidenceLevel === 'high'
                      ? '高'
                      : suggestion.confidenceLevel === 'medium'
                        ? '中'
                        : '低';

                  // 计算趋势图标
                  const trendIcon =
                    suggestion.predictedMonthTotal > suggestion.historicalAvg * 1.1
                      ? '↑'
                      : suggestion.predictedMonthTotal < suggestion.historicalAvg * 0.9
                        ? '↓'
                        : '~';

                  const trendColor =
                    trendIcon === '↑'
                      ? 'text-red-500'
                      : trendIcon === '↓'
                        ? 'text-green-500'
                        : 'text-gray-500';

                  const usageRatio =
                    suggestion.suggestedAmount > 0
                      ? suggestion.currentMonthSpending / suggestion.suggestedAmount
                      : 0;

                  const isExpanded = expandedSuggestions.has(suggestion.categoryKey);

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
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${confidenceColor} cursor-help`}
                            >
                              {confidenceLabel}
                            </span>
                            {/* Tooltip 解释 */}
                            <div className="absolute right-0 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                              {confidenceLabel === '高'
                                ? '基于充足的历史数据，预测准确度很高'
                                : confidenceLabel === '中'
                                  ? '基于一定的历史数据，预测准确度一般'
                                  : '历史数据不足，预测准确度较低'}
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
                              {Math.min(100, usagePercent).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                usageRatio > 1
                                  ? 'bg-red-500'
                                  : usageRatio >= 0.8
                                    ? 'bg-orange-500'
                                    : usageRatio >= 0.5
                                      ? 'bg-blue-500'
                                      : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, usagePercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          🔮 当月预测支出: ¥{suggestion.predictedMonthTotal.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedSuggestions((prev) => {
                              const next = new Set(prev);
                              if (next.has(suggestion.categoryKey)) {
                                next.delete(suggestion.categoryKey);
                              } else {
                                next.add(suggestion.categoryKey);
                              }
                              return next;
                            });
                          }}
                          className="text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          {isExpanded ? '收起详情' : '查看详情'}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-2">
                          <div>📅 历史平均: ¥{suggestion.historicalAvg.toLocaleString()}</div>
                          <div>
                            💰 当月已支出: ¥{suggestion.currentMonthSpending.toLocaleString()}
                          </div>
                          <div>🤖 {suggestion.reason.split('**').join('')}</div>
                          <div className="flex items-center gap-1">
                            <span>趋势:</span>
                            <span className={`font-bold ${trendColor}`}>{trendIcon}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        )}

        {/* Toast提示 */}
        {showToast && <ProgressToast message={toastMessage} onClose={() => setShowToast(false)} />}
      </div>
    </div>
  );
}
