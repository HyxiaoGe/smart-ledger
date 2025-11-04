'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressToast } from '@/components/shared/ProgressToast';
import {
  getMonthlyBudgetStatus,
  getTotalBudgetSummary,
  setBudget,
  deleteBudget,
  getCurrentYearMonth,
  formatMonth,
  getBudgetStatusLabel,
  getProgressBarColor,
  type BudgetStatus,
  type TotalBudgetSummary,
} from '@/lib/services/budgetService';
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusData, summaryData, categoriesData] = await Promise.all([
        getMonthlyBudgetStatus(year, month),
        getTotalBudgetSummary(year, month),
        getCategoriesWithStats(),
      ]);

      setBudgetStatuses(statusData);
      setSummary(summaryData);
      setCategories(categoriesData.filter(c => c.is_active));
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

  const totalBudget = summary?.total_budget || 0;
  const totalSpent = summary?.total_spent || 0;
  const totalRemaining = summary?.total_remaining || 0;
  const usagePercentage = summary?.usage_percentage || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="mb-8">
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回消费配置
            </Button>
          </Link>
        </div>

        {/* 页面标题和月份 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">月度预算设置</h2>
            <p className="text-gray-600">管理您的月度预算，控制支出更轻松</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <Calendar className="inline h-4 w-4 mr-2 text-blue-600" />
              <span className="font-semibold text-blue-900">{formatMonth(year, month)}</span>
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
              {totalBudget === 0 && (
                <Button
                  size="sm"
                  onClick={() => openSetBudgetDialog(null)}
                  className="w-full bg-white text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  设置总预算
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">已支出</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ¥{totalSpent.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">剩余</div>
                  <div className="text-2xl font-bold text-green-600">
                    ¥{totalRemaining.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm text-gray-600 mb-1">使用率</div>
                  <div className="text-2xl font-bold text-gray-900">{usagePercentage.toFixed(1)}%</div>
                </div>
                <div className={`p-3 rounded-lg ${usagePercentage > 100 ? 'bg-red-50' : usagePercentage >= 80 ? 'bg-orange-50' : 'bg-green-50'}`}>
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
          <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
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

        {/* 分类预算列表 */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <div className="p-2 bg-blue-100 rounded-lg">
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
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                  <PiggyBank className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">还没有设置分类预算</h3>
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
                      className="group rounded-xl border-2 border-gray-200 p-5 hover:shadow-md transition-all"
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
                            <h3 className="font-semibold text-gray-900 text-lg">{budget.category_label}</h3>
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
                            className="hover:bg-blue-50"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBudget(budget.id, budget.category_label)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">预算</div>
                          <div className="text-lg font-semibold text-gray-900">
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
                          <span className="text-gray-600">使用率</span>
                          <span className="font-semibold text-gray-900">{budget.usage_percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${progressColor}`}
                            style={{ width: `${Math.min(budget.usage_percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">
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
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-xl">
            {budget ? '编辑预算' : '设置预算'}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {!budget && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择类别
              </label>
              <select
                value={selectedCategoryKey || ''}
                onChange={(e) => setSelectedCategoryKey(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              💡 提示：系统会在预算使用达到 80% 时提醒您
            </p>
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
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
