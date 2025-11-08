'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import {
  getMonthlyBudgetStatus,
  getTotalBudgetSummary,
  setBudget,
  deleteBudget,
  getCurrentYearMonth,
  formatMonth,
  getBudgetStatusLabel,
  getProgressBarColor,
  getBudgetSuggestions,
  type BudgetStatus,
  type TotalBudgetSummary,
} from '@/lib/services/budgetService';
import { markTransactionsDirty } from '@/lib/core/dataSync';
import { getCategoriesWithStats, type Category } from '@/lib/services/categoryService';
import {
  ChevronLeft,
  PiggyBank,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Calendar,
} from 'lucide-react';

export default function BudgetPage() {
  const { year, month } = getCurrentYearMonth();
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [summary, setSummary] = useState<TotalBudgetSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetBudgetDialog, setShowSetBudgetDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetStatus | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusData, summaryData, categoriesData, suggestionsData] = await Promise.all([
        getMonthlyBudgetStatus(year, month),
        getTotalBudgetSummary(year, month, 'CNY'),
        getCategoriesWithStats(),
        getBudgetSuggestions(year, month),
      ]);

      setBudgetStatuses(statusData);
      setSummary(summaryData);
      setCategories(categoriesData.filter(c => c.is_active));
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error('获取预算数据失败:', error);
      setToastMessage('❌ 获取数据失败');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSetBudget = async () => {
    const amount = parseFloat(budgetAmount);
    if (!amount || amount <= 0) {
      setToastMessage('❌ 请输入有效金额');
      setShowToast(true);
      return;
    }

    try {
      await setBudget({
        year,
        month,
        categoryKey: selectedBudget?.category_key || null,
        amount,
      });

      // 触发跨页面数据同步，让账单列表也刷新
      markTransactionsDirty();

      setToastMessage('✅ 预算设置成功');
      setShowToast(true);
      setShowSetBudgetDialog(false);
      setBudgetAmount('');
      setSelectedBudget(null);
      await fetchData();
    } catch (error: any) {
      console.error('设置预算失败:', error);
      setToastMessage(`❌ ${error.message || '设置失败'}`);
      setShowToast(true);
    }
  };

  const handleDeleteBudget = async (id: string, label: string) => {
    if (!confirm(`确定要删除"${label}"的预算设置吗？`)) return;

    try {
      await deleteBudget(id);

      // 触发跨页面数据同步，让账单列表也刷新
      markTransactionsDirty();

      setToastMessage('✅ 预算已删除');
      setShowToast(true);
      await fetchData();
    } catch (error: any) {
      console.error('删除预算失败:', error);
      setToastMessage(`❌ ${error.message || '删除失败'}`);
      setShowToast(true);
    }
  };

  const openSetBudgetDialog = (budget: BudgetStatus | null = null) => {
    setSelectedBudget(budget);
    setBudgetAmount(budget ? budget.budget_amount.toString() : '');
    setShowSetBudgetDialog(true);
  };

  const handleApplySuggestion = async (categoryKey: string, amount: number) => {
    try {
      await setBudget({
        year,
        month,
        categoryKey,
        amount,
      });

      markTransactionsDirty();
      setToastMessage('✅ 已应用建议预算');
      setShowToast(true);

      // 只刷新预算状态数据，不刷新整个页面
      const [statusData, summaryData] = await Promise.all([
        getMonthlyBudgetStatus(year, month),
        getTotalBudgetSummary(year, month, 'CNY'),
      ]);
      setBudgetStatuses(statusData);
      setSummary(summaryData);
    } catch (error: any) {
      console.error('应用建议失败:', error);
      setToastMessage(`❌ ${error.message || '应用失败'}`);
      setShowToast(true);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100 dark:text-gray-100">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回消费配置
            </Button>
          </Link>
        </div>

        {/* 页面标题和月份 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-2">月度预算设置</h2>
            <p className="text-gray-600 dark:text-gray-300">管理您的月度预算，控制支出更轻松</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 dark:border-blue-800">
              <Calendar className="inline h-4 w-4 mr-2 text-blue-600" />
              <span className="font-semibold text-blue-900 dark:text-blue-100 dark:text-blue-100">{formatMonth(year, month)}</span>
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
              {totalBudget === 0 ? (
                <Button
                  size="sm"
                  onClick={() => openSetBudgetDialog(null)}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  设置总预算
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    // 找到总预算记录（category_key 为 null 的）
                    const totalBudgetRecord = budgetStatuses.find(b => !b.category_key);
                    if (totalBudgetRecord) {
                      openSetBudgetDialog(totalBudgetRecord);
                    } else {
                      openSetBudgetDialog(null);
                    }
                  }}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  调整预算
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800 dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">已支出</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">
                    ¥{totalSpent.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950 dark:bg-red-950 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800 dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">剩余</div>
                  <div className="text-2xl font-bold text-green-600">
                    ¥{totalRemaining.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 dark:bg-green-950 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-gray-800 dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm text-gray-600 mb-1">使用率</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">{usagePercentage.toFixed(1)}%</div>
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
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950 dark:bg-orange-950 border-l-4 border-orange-500 rounded-lg">
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
                <span>💡</span>
                <span>智能预算建议</span>
                <span className="text-xs font-normal text-purple-600 dark:text-purple-300">
                  基于历史消费数据分析
                </span>
              </CardTitle>
            </CardHeader>
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
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {category.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            建议预算: <span className="font-bold text-purple-600">¥{suggestion.suggestedAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${confidenceColor}`}>
                          可信度: {confidenceLabel}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleApplySuggestion(suggestion.categoryKey, suggestion.suggestedAmount)}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          {budgetStatuses.find(b => b.category_key === suggestion.categoryKey) ? '重新应用' : '应用'}
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {suggestion.reason.split('**').map((part, i) =>
                        i % 2 === 1 ? <strong key={i} className="font-bold text-purple-700 dark:text-purple-300">{part}</strong> : part
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <div>
                        历史平均: ¥{suggestion.historicalAvg.toLocaleString()}
                      </div>
                      <div>
                        当前已支出: ¥{suggestion.currentMonthSpending.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        预测月底: ¥{suggestion.predictedMonthTotal.toLocaleString()}
                        <span className={`font-bold ${trendColor}`}>{trendIcon}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* 分类预算列表 */}
        <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 dark:from-gray-800 dark:to-gray-750 border-b dark:border-gray-700 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100 dark:text-gray-100">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 dark:bg-blue-900 rounded-lg">
                  <PiggyBank className="h-5 w-5 text-blue-600" />
                </div>
                <span>分类预算</span>
                <span className="text-sm text-gray-500 font-normal">
                  ({budgetStatuses.filter(b => b.category_key).length} 个类别)
                </span>
              </CardTitle>
              <Button
                size="sm"
                onClick={() => openSetBudgetDialog(null)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                添加预算
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {budgetStatuses.filter(b => b.category_key).length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <PiggyBank className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-2">还没有设置分类预算</h3>
                <p className="text-gray-500 mb-6">
                  为不同的消费类别设置预算上限，帮助您更好地控制支出
                </p>
                <Button onClick={() => openSetBudgetDialog(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加第一个预算
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {budgetStatuses.filter(b => b.category_key).map((budget) => {
                  const statusLabel = getBudgetStatusLabel(budget);
                  const progressColor = getProgressBarColor(budget.usage_percentage, budget.is_over_budget);

                  return (
                    <div
                      key={budget.id}
                      className="group rounded-xl border-2 border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center w-12 h-12 rounded-lg text-2xl"
                            style={{ backgroundColor: `${budget.category_color}20` }}
                          >
                            {budget.category_icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 text-lg">{budget.category_label}</h3>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${statusLabel.bgColor} ${statusLabel.color}`}>
                              <span>{statusLabel.icon}</span>
                              <span>{statusLabel.label}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSetBudgetDialog(budget)}
                            className="hover:bg-blue-50 dark:hover:bg-blue-950 dark:bg-blue-950"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBudget(budget.id, budget.category_label)}
                            className="hover:bg-red-50 dark:bg-red-950 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">预算</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">
                            ¥{budget.budget_amount.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">已用</div>
                          <div className="text-lg font-semibold text-red-600">
                            ¥{budget.spent_amount.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">剩余</div>
                          <div className="text-lg font-semibold text-green-600">
                            ¥{budget.remaining_amount.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">使用率</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">{budget.usage_percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${progressColor}`}
                            style={{ width: `${Math.min(budget.usage_percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          {budget.transaction_count} 笔交易
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 设置预算对话框 */}
        {showSetBudgetDialog && (
          <SetBudgetDialog
            budget={selectedBudget}
            categories={categories}
            budgetAmount={budgetAmount}
            onAmountChange={setBudgetAmount}
            onConfirm={handleSetBudget}
            onCancel={() => {
              setShowSetBudgetDialog(false);
              setBudgetAmount('');
              setSelectedBudget(null);
            }}
          />
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

// 设置预算对话框
function SetBudgetDialog({
  budget,
  categories,
  budgetAmount,
  onAmountChange,
  onConfirm,
  onCancel,
}: {
  budget: BudgetStatus | null;
  categories: Category[];
  budgetAmount: string;
  onAmountChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(
    budget?.category_key || null
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b dark:border-gray-700">
          <h3 className="font-semibold text-xl">
            {budget ? '编辑预算' : '设置预算'}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {!budget && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                选择类别
              </label>
              <select
                value={selectedCategoryKey || ''}
                onChange={(e) => setSelectedCategoryKey(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
              >
                <option value="">总预算</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.key}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预算金额 (¥) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={budgetAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="例如：5000"
              min="0"
              step="0.01"
            />
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100 dark:text-blue-100">
              💡 提示：系统会在预算使用达到 80% 时提醒您
            </p>
          </div>
        </div>
        <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={!budgetAmount || parseFloat(budgetAmount) <= 0}>
            确认
          </Button>
        </div>
      </div>
    </div>
  );
}
