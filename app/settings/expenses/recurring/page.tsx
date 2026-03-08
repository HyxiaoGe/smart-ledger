'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { useAutoGenerateRecurring } from '@/hooks/useAutoGenerateRecurring';
import { Calendar, Plus, DollarSign, History, Zap } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { recurringExpensesApi, RecurringExpense } from '@/lib/api/services/recurring-expenses';
import {
  useDeleteRecurringExpense,
  useGenerateRecurringExpenses,
  useRecurringExpenses,
  useUpdateRecurringExpense,
} from '@/lib/api/hooks/useRecurringExpenses';
import { holidaysApi } from '@/lib/api/services/holidays';
import {
  StatsCards,
  RecurringExpenseCard,
  FeatureDescription,
  PauseConfirmDialog,
  DeleteConfirmDialog,
} from './components';

function buildGenerationToastMessage(
  result: Awaited<ReturnType<typeof recurringExpensesApi.generate>>,
  emptyLabel: string
): string {
  const names = Array.from(
    new Set(
      result.results
        .filter((item) => item.status === 'success')
        .map((item) => item.expense_name)
        .filter((name): name is string => Boolean(name))
    )
  ).slice(0, 3);

  if (result.summary.success > 0) {
    const detailMessage =
      names.length > 0
        ? `：${names.join('、')}${result.summary.success > names.length ? ' 等' : ''}`
        : '';
    return `✅ 成功生成 ${result.summary.success} 笔${detailMessage}`;
  }

  if (result.summary.failed > 0) {
    return `❌ 生成失败：${result.summary.failed} 个错误`;
  }

  return emptyLabel;
}

export default function RecurringExpensesPage() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<RecurringExpense | null>(null);
  const [confirmPause, setConfirmPause] = useState<RecurringExpense | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [sortBy, setSortBy] = useState<'next' | 'amount' | 'name'>('next');
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());

  // 使用 React Query 获取固定支出列表
  const {
    data: recurringExpensesData,
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useRecurringExpenses();

  const error = fetchError ? '获取固定支出列表失败' : null;
  const recurringExpenses = recurringExpensesData || [];

  const visibleExpenses = useMemo(() => {
    const filtered = recurringExpenses.filter((expense) => {
      if (filter === 'active') return expense.is_active;
      if (filter === 'paused') return !expense.is_active;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'amount') {
        return b.amount - a.amount;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'zh-CN');
      }
      const aDate = a.next_generate ? new Date(a.next_generate).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.next_generate ? new Date(b.next_generate).getTime() : Number.POSITIVE_INFINITY;
      if (aDate !== bDate) return aDate - bDate;
      return b.amount - a.amount;
    });

    return sorted;
  }, [filter, sortBy, recurringExpenses]);

  // 使用状态展示 Hook
  const { getExpenseGenerationStatus } = useAutoGenerateRecurring(recurringExpenses);

  // 生成固定支出 mutation
  const generateMutation = useGenerateRecurringExpenses();
  const generateOverdueMutation = useGenerateRecurringExpenses();

  const syncHolidayMutation = useMutation({
    mutationFn: (year: number) => holidaysApi.sync(year),
    onSuccess: (data) => {
      setToastMessage(`✅ 已同步 ${data.year} 年节假日（${data.count} 天）`);
      setShowToast(true);
    },
    onError: () => {
      setToastMessage('❌ 节假日同步失败');
      setShowToast(true);
    }
  });

  // 更新状态 mutation
  const updateMutation = useUpdateRecurringExpense();
  const deleteMutation = useDeleteRecurringExpense();

  const handleGenerate = (includeOverdue?: boolean) => {
    const mutation = includeOverdue ? generateOverdueMutation : generateMutation;
    mutation.mutate(
      includeOverdue ? { includeOverdue: true } : undefined,
      {
        onSuccess: (data) => {
          setToastMessage(
            buildGenerationToastMessage(
              data,
              includeOverdue ? '💡 没有需要补生成的固定支出' : '💡 今日无需生成'
            )
          );
          setShowToast(true);
        },
        onError: () => {
          setToastMessage(includeOverdue ? '❌ 补生成失败' : '❌ 生成失败');
          setShowToast(true);
        }
      }
    );
  };

  const handleUpdateStatus = (params: { id: string; is_active: boolean }) => {
    updateMutation.mutate(params, {
      onSuccess: (_, variables) => {
        setToastMessage(variables.is_active ? '✅ 已启用' : '⏸️ 已暂停');
        setShowToast(true);
        setConfirmPause(null);
      },
      onError: () => {
        setToastMessage('❌ 更新状态失败');
        setShowToast(true);
      }
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setToastMessage('✅ 已删除');
        setShowToast(true);
        setConfirmDelete(null);
      },
      onError: () => {
        setToastMessage('❌ 删除失败');
        setShowToast(true);
      }
    });
  };

  // 切换启用/禁用状态
  const toggleActiveStatus = (expense: RecurringExpense) => {
    if (expense.is_active) {
      setConfirmPause(expense);
    } else {
      handleUpdateStatus({ id: expense.id, is_active: true });
    }
  };

  // 确认暂停
  const confirmPauseExpense = (expense: RecurringExpense) => {
    handleUpdateStatus({ id: expense.id, is_active: false });
  };

  // 确认删除
  const confirmDeleteExpense = (expense: RecurringExpense) => {
    handleDelete(expense.id);
  };

  if (loading) {
    return <PageSkeleton stats={3} listColumns={1} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings/expenses">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100">
                ← 返回消费配置
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={() => refetch()}>重试</Button>
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
          <Link href="/settings/expenses">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 dark:text-gray-100">
              ← 返回消费配置
            </Button>
          </Link>
        </div>

        {/* 页面标题和操作按钮 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">固定支出管理</h2>
            <p className="text-gray-600 dark:text-gray-400">设置和管理您的定期固定支出，系统将自动生成记录</p>
          </div>
          <div className="flex gap-3">
            <Link href="/settings/expenses/recurring/add">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                添加固定支出
              </Button>
            </Link>
            <Link href="/settings/expenses/recurring/history">
              <Button variant="outline" className="group">
                <History className="h-4 w-4 mr-2 group-hover:text-blue-600 transition-colors" />
                查看历史
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <select
                value={holidayYear}
                onChange={(event) => setHolidayYear(Number(event.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-sm"
              >
                {[0, 1].map((offset) => {
                  const year = new Date().getFullYear() + offset;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
              <Button
                onClick={() => syncHolidayMutation.mutate(holidayYear)}
                disabled={syncHolidayMutation.isPending}
                variant="outline"
                className="group"
                title="同步节假日数据，用于节假日跳过生成"
              >
                {syncHolidayMutation.isPending ? '同步中...' : '节假日同步'}
              </Button>
            </div>
            <Button
              onClick={() => handleGenerate(true)}
              disabled={generateOverdueMutation.isPending}
              variant="outline"
              className="group"
              title="补生成之前到期但未生成的固定支出"
            >
              <Zap className="h-4 w-4 mr-2 group-hover:text-orange-500 transition-colors" />
              {generateOverdueMutation.isPending ? '补生成中...' : '补生成逾期'}
            </Button>
            <Button
              onClick={() => handleGenerate()}
              disabled={generateMutation.isPending}
              variant="outline"
              className="group"
              title="手动触发生成今日固定账单（正常情况下每天00:01自动执行）"
            >
              <Zap className="h-4 w-4 mr-2 group-hover:text-yellow-500 transition-colors" />
              {generateMutation.isPending ? '生成中...' : '手动触发生成'}
            </Button>
          </div>
        </div>

        {/* 统计概览 */}
        <StatsCards
          expenses={recurringExpenses}
          getExpenseGenerationStatus={getExpenseGenerationStatus}
        />

        {/* 固定支出列表 */}
        <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span>固定支出列表</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                  ({visibleExpenses.length} 个项目)
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {recurringExpenses.filter(e => e.is_active).length} 个活跃
                </span>
                <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recurringExpenses.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full mb-6">
                  <Calendar className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  还没有设置固定支出
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  设置固定支出后，系统会自动生成定期账单，让记账更轻松高效
                </p>
                <div className="flex flex-col items-center gap-4">
                  <Link href="/settings/expenses/recurring/add">
                    <Button className="bg-blue-600 hover:bg-blue-700 px-6 py-3">
                      <Plus className="h-5 w-5 mr-2" />
                      添加第一个固定支出
                    </Button>
                  </Link>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
                    {[
                      { name: '房租', category: 'rent', amount: 3500, frequency: 'monthly', day_of_month: 1 },
                      { name: '水电费', category: 'utilities', amount: 300, frequency: 'monthly', day_of_month: 5 },
                      { name: '视频会员', category: 'subscription', amount: 30, frequency: 'monthly', day_of_month: 15 },
                    ].map((template) => {
                      const params = new URLSearchParams({
                        name: template.name,
                        category: template.category,
                        amount: String(template.amount),
                        frequency: template.frequency,
                        day_of_month: String(template.day_of_month),
                      }).toString();
                      return (
                        <Link
                          key={template.name}
                          href={`/settings/expenses/recurring/add?${params}`}
                          className="block"
                        >
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-left hover:border-blue-300 hover:shadow-sm transition-all">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ¥{template.amount} · 每月{template.day_of_month}号
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { value: 'all', label: '全部' },
                      { value: 'active', label: '仅活跃' },
                      { value: 'paused', label: '已暂停' },
                    ].map((item) => (
                      <Button
                        key={item.value}
                        size="sm"
                        variant={filter === item.value ? 'default' : 'outline'}
                        onClick={() => setFilter(item.value as typeof filter)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>排序</span>
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-sm"
                    >
                      <option value="next">下次生成优先</option>
                      <option value="amount">金额从高到低</option>
                      <option value="name">名称 A-Z</option>
                    </select>
                  </div>
                </div>
                {visibleExpenses.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    当前筛选下没有固定支出
                  </div>
                ) : (
                  visibleExpenses.map((expense) => (
                    <RecurringExpenseCard
                      key={expense.id}
                      expense={expense}
                      generationStatus={getExpenseGenerationStatus(expense)}
                      onToggleActive={() => toggleActiveStatus(expense)}
                      onDelete={() => setConfirmDelete(expense)}
                    />
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <FeatureDescription />

        {/* 暂停确认对话框 */}
        {confirmPause && (
          <PauseConfirmDialog
            expense={confirmPause}
            onConfirm={() => confirmPauseExpense(confirmPause)}
            onCancel={() => setConfirmPause(null)}
          />
        )}

        {/* 删除确认对话框 */}
        {confirmDelete && (
          <DeleteConfirmDialog
            expense={confirmDelete}
            onConfirm={() => confirmDeleteExpense(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
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
