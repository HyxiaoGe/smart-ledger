'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { useAutoGenerateRecurring } from '@/hooks/useAutoGenerateRecurring';
import { Calendar, Plus, DollarSign, History, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recurringExpensesApi, RecurringExpense } from '@/lib/api/services/recurring-expenses';
import {
  StatsCards,
  RecurringExpenseCard,
  FeatureDescription,
  PauseConfirmDialog,
  DeleteConfirmDialog,
} from './components';

export default function RecurringExpensesPage() {
  const queryClient = useQueryClient();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<RecurringExpense | null>(null);
  const [confirmPause, setConfirmPause] = useState<RecurringExpense | null>(null);

  // 使用 React Query 获取固定支出列表
  const {
    data: recurringExpensesData,
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: () => recurringExpensesApi.list(),
  });

  const error = fetchError ? '获取固定支出列表失败' : null;
  const recurringExpenses = recurringExpensesData || [];

  // 使用状态展示 Hook
  const { getExpenseGenerationStatus } = useAutoGenerateRecurring(recurringExpenses);

  // 生成固定支出 mutation
  const generateMutation = useMutation({
    mutationFn: () => recurringExpensesApi.generate(),
    onSuccess: (data) => {
      const count = data.count || 0;
      setToastMessage(count > 0 ? `✅ 成功生成 ${count} 笔` : '💡 今日无需生成');
      setShowToast(true);
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    },
    onError: () => {
      setToastMessage('❌ 生成失败');
      setShowToast(true);
    }
  });

  // 更新状态 mutation
  const updateMutation = useMutation({
    mutationFn: (params: { id: string; is_active: boolean }) =>
      recurringExpensesApi.update(params.id, { is_active: params.is_active }),
    onSuccess: (_, variables) => {
      setToastMessage(variables.is_active ? '✅ 已启用' : '⏸️ 已暂停');
      setShowToast(true);
      setConfirmPause(null);
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    },
    onError: () => {
      setToastMessage('❌ 更新状态失败');
      setShowToast(true);
    }
  });

  // 删除 mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => recurringExpensesApi.delete(id),
    onSuccess: () => {
      setToastMessage('✅ 已删除');
      setShowToast(true);
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    },
    onError: () => {
      setToastMessage('❌ 删除失败');
      setShowToast(true);
    }
  });

  // 切换启用/禁用状态
  const toggleActiveStatus = (expense: RecurringExpense) => {
    if (expense.is_active) {
      setConfirmPause(expense);
    } else {
      updateMutation.mutate({ id: expense.id, is_active: true });
    }
  };

  // 确认暂停
  const confirmPauseExpense = (expense: RecurringExpense) => {
    updateMutation.mutate({ id: expense.id, is_active: false });
  };

  // 确认删除
  const confirmDeleteExpense = (expense: RecurringExpense) => {
    deleteMutation.mutate(expense.id);
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
            <Link href="/settings/expenses/recurring/history">
              <Button variant="outline" className="group">
                <History className="h-4 w-4 mr-2 group-hover:text-blue-600 transition-colors" />
                查看历史
              </Button>
            </Link>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              variant="outline"
              className="group"
              title="手动触发生成今日固定账单（正常情况下每天00:01自动执行）"
            >
              <Zap className="h-4 w-4 mr-2 group-hover:text-yellow-500 transition-colors" />
              {generateMutation.isPending ? '生成中...' : '手动触发生成'}
            </Button>
            <Link href="/settings/expenses/recurring/add">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                添加固定支出
              </Button>
            </Link>
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
                  ({recurringExpenses.length} 个项目)
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
                <Link href="/settings/expenses/recurring/add">
                  <Button className="bg-blue-600 hover:bg-blue-700 px-6 py-3">
                    <Plus className="h-5 w-5 mr-2" />
                    添加第一个固定支出
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recurringExpenses.map((expense) => (
                  <RecurringExpenseCard
                    key={expense.id}
                    expense={expense}
                    generationStatus={getExpenseGenerationStatus(expense)}
                    onToggleActive={() => toggleActiveStatus(expense)}
                    onDelete={() => setConfirmDelete(expense)}
                  />
                ))}
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
