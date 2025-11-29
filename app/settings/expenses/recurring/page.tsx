'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { useAutoGenerateRecurring } from '@/hooks/useAutoGenerateRecurring';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Calendar,
  Plus,
  Wallet,
  Clock,
  DollarSign,
  Settings2,
  Pause,
  Play,
  Edit,
  Trash2,
  History,
  Zap
} from 'lucide-react';

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  frequency_config: Record<string, any>;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  last_generated?: string;
  next_generate?: string;
  created_at: string;
}

export default function RecurringExpensesPage() {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<RecurringExpense | null>(null);
  const [confirmPause, setConfirmPause] = useState<RecurringExpense | null>(null);

  // 使用状态展示 Hook
  const { getExpenseGenerationStatus } = useAutoGenerateRecurring(recurringExpenses);

  // 获取固定支出列表
  useEffect(() => {
    fetchRecurringExpenses();
  }, []);

  const fetchRecurringExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recurring-expenses');
      if (!response.ok) {
        throw new Error('获取固定支出列表失败');
      }
      const data = await response.json();
      setRecurringExpenses(data);
    } catch (error) {
      console.error('获取固定支出列表失败:', error);
      setError('获取固定支出列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 手动生成固定支出（调用 API）
  const handleGenerateExpenses = async () => {
    try {
      setGenerating(true);

      const response = await fetch('/api/recurring/generate', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('生成请求失败');
      }

      const data = await response.json();
      const results = data.results || [];

      const successCount = results.filter((r: any) => r.status === 'success').length;
      const failedCount = results.filter((r: any) => r.status === 'failed').length;

      let message = '';
      if (successCount > 0) {
        message += `✅ 成功生成 ${successCount} 笔`;
      }
      if (failedCount > 0) {
        message += ` ❌ 失败 ${failedCount} 笔`;
      }
      if (successCount === 0 && failedCount === 0) {
        message = '💡 今日无需生成';
      }

      setToastMessage(message);
      setShowToast(true);

      // 重新获取列表
      await fetchRecurringExpenses();
    } catch (error) {
      console.error('生成固定支出失败:', error);
      setToastMessage('❌ 生成失败');
      setShowToast(true);
    } finally {
      setGenerating(false);
    }
  };

  // 切换启用/禁用状态
  const toggleActiveStatus = (expense: RecurringExpense) => {
    if (expense.is_active) {
      // 如果是启用状态，需要确认才暂停
      setConfirmPause(expense);
    } else {
      // 如果是暂停状态，直接启用
      performToggleActive(expense.id, false);
    }
  };

  // 执行状态切换
  const performToggleActive = async (id: string, showPauseConfirm: boolean) => {
    try {
      // 获取当前状态
      const currentExpense = recurringExpenses.find(e => e.id === id);
      if (!currentExpense) return;

      const response = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentExpense.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('更新状态失败');
      }

      const action = currentExpense.is_active ? '暂停' : '启用';
      setToastMessage(`${action}成功`);
      setShowToast(true);

      // 清除确认状态
      if (showPauseConfirm) {
        setConfirmPause(null);
      }

      // 重新获取列表
      await fetchRecurringExpenses();
    } catch (error) {
      console.error('更新状态失败:', error);
      setToastMessage('更新状态失败');
      setShowToast(true);
    }
  };

  // 确认暂停
  const confirmPauseExpense = async (expense: RecurringExpense) => {
    await performToggleActive(expense.id, true);
  };

  // 删除固定支出
  const deleteExpense = (expense: RecurringExpense) => {
    setConfirmDelete(expense);
  };

  // 确认删除
  const confirmDeleteExpense = async (expense: RecurringExpense) => {
    try {
      const response = await fetch(`/api/recurring-expenses/${expense.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      setToastMessage('删除成功');
      setShowToast(true);
      setConfirmDelete(null);

      // 重新获取列表
      await fetchRecurringExpenses();
    } catch (error) {
      console.error('删除失败:', error);
      setToastMessage('删除失败');
      setShowToast(true);
    }
  };

  const frequencyLabels = {
    daily: '每日',
    weekly: '每周',
    monthly: '每月'
  };

  
  const categoryIcons = {
    rent: '🏠',
    transport: '🚇',
    sport: '💪',
    food: '🍽️',
    subscription: '📱',
    entertainment: '🎮',
    utilities: '💡',
    other: '💰'
  };

  if (loading) {
    return <PageSkeleton stats={3} listColumns={1} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            items={[
              { label: '设置', href: '/settings' },
              { label: '消费配置', href: '/settings/expenses' },
              { label: '固定支出' }
            ]}
            className="mb-6"
          />
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={fetchRecurringExpenses}>重试</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑导航 */}
        <Breadcrumb
          items={[
            { label: '设置', href: '/settings' },
            { label: '消费配置', href: '/settings/expenses' },
            { label: '固定支出' }
          ]}
          className="mb-6"
        />

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
              onClick={handleGenerateExpenses}
              disabled={generating}
              variant="outline"
              className="group"
              title="手动触发生成今日固定账单（正常情况下每天00:01自动执行）"
            >
              <Zap className="h-4 w-4 mr-2 group-hover:text-yellow-500 transition-colors" />
              {generating ? '生成中...' : '手动触发生成'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 本月生成统计卡片 */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
              <Wallet className="h-32 w-32" />
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {recurringExpenses.filter(e => {
                      if (!e.is_active || !e.last_generated) return false;
                      const lastGenerated = new Date(e.last_generated);
                      const now = new Date();
                      return lastGenerated.getMonth() === now.getMonth() &&
                             lastGenerated.getFullYear() === now.getFullYear();
                    }).length}
                  </div>
                  <div className="text-sm text-blue-100 mt-1">
                    个本月已生成
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-100">
                  {recurringExpenses.filter(e => e.is_active).length} 个活跃项目
                </div>
                <div className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                  自动化管理
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 明日自动生成卡片 */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
              <Calendar className="h-32 w-32" />
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {(() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tomorrowStr = tomorrow.toISOString().split('T')[0];
                      const dayOfWeek = tomorrow.getDay();

                      return recurringExpenses.filter(e => {
                        if (!e.is_active) return false;

                        if (e.next_generate !== tomorrowStr) return false;

                        switch (e.frequency) {
                          case 'daily':
                            return true;
                          case 'weekly':
                            return e.frequency_config.days_of_week?.includes(dayOfWeek);
                          case 'monthly':
                            return e.frequency_config.day_of_month === tomorrow.getDate();
                          default:
                            return false;
                        }
                      }).length;
                    })()}
                  </div>
                  <div className="text-sm text-amber-100 mt-1">
                    个明日生成
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-amber-100">
                  明日自动生成
                </div>
                <div className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                  预计
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 已生成记录卡片 */}
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
              <History className="h-32 w-32" />
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <History className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {recurringExpenses.filter(e => getExpenseGenerationStatus(e).status === 'generated').length}
                  </div>
                  <div className="text-sm text-emerald-100 mt-1">
                    个今日已生成
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-emerald-100">
                  今日自动生成记录
                </div>
                <div className="text-xs bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                  已完成
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">还没有设置固定支出</h3>
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
                  <div
                    key={expense.id}
                    className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                      expense.is_active
                        ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
                        : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {/* 状态指示条 */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      expense.is_active ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>

                    <div className="p-6 pl-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* 类别图标 */}
                          <div className={`relative p-3 rounded-xl transition-transform group-hover:scale-110 ${
                            expense.is_active
                              ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700'
                          }`}>
                            <div className="text-2xl">
                              {categoryIcons[expense.category as keyof typeof categoryIcons] || '💰'}
                            </div>
                            {expense.is_active && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full border-2 border-white dark:border-gray-800"></div>
                            )}
                          </div>

                          {/* 详细信息 */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{expense.name}</h3>
                              {expense.is_active ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                                  <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                                  活跃
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                  <Pause className="h-3 w-3 mr-1" />
                                  暂停
                                </span>
                              )}
                            </div>

                            {/* 金额和频率 */}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                                <span className="text-lg">¥</span>
                                <span>{expense.amount.toFixed(0)}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">.{(expense.amount % 1).toFixed(2).slice(2)}</span>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                {frequencyLabels[expense.frequency]}
                                {expense.frequency === 'monthly' && expense.frequency_config.day_of_month &&
                                  ` · 每月${expense.frequency_config.day_of_month}号`
                                }
                                {expense.frequency === 'weekly' && expense.frequency_config.days_of_week &&
                                  ` · 周${expense.frequency_config.days_of_week.map((d: number) => ['日','一','二','三','四','五','六'][d]).join('、')}`
                                }
                              </div>
                            </div>

                            {/* 时间信息 */}
                            <div className="flex items-center gap-6 text-xs">
                              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                <Calendar className="h-3 w-3" />
                                开始: {expense.start_date}
                              </span>
                              <span className={`flex items-center gap-1 px-2 py-1 rounded-full border ${getExpenseGenerationStatus(expense).bgColor} ${getExpenseGenerationStatus(expense).borderColor} ${getExpenseGenerationStatus(expense).color} font-medium`}>
                                {getExpenseGenerationStatus(expense).status === 'generated' && <History className="h-3 w-3" />}
                                {getExpenseGenerationStatus(expense).status === 'pending' && <Clock className="h-3 w-3" />}
                                {getExpenseGenerationStatus(expense).status === 'scheduled' && <Clock className="h-3 w-3" />}
                                {getExpenseGenerationStatus(expense).text}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant={expense.is_active ? "outline" : "default"}
                            size="sm"
                            onClick={() => toggleActiveStatus(expense)}
                            className={expense.is_active ? "hover:bg-orange-50 dark:hover:bg-orange-950 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-700 dark:hover:text-orange-300" : "bg-green-600 hover:bg-green-700"}
                          >
                            {expense.is_active ? (
                              <><Pause className="h-4 w-4 mr-1" /> 暂停</>
                            ) : (
                              <><Play className="h-4 w-4 mr-1" /> 启用</>
                            )}
                          </Button>

                          <Link href={`/settings/expenses/recurring/${expense.id}/edit`}>
                            <Button variant="outline" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-950 dark:bg-blue-950 hover:border-blue-300 dark:border-blue-700 hover:text-blue-700 dark:text-blue-300">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteExpense(expense)}
                            className="hover:bg-red-50 dark:bg-red-950 hover:border-red-300 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 dark:from-blue-950 via-white dark:via-gray-900 to-purple-50 dark:to-purple-950 rounded-2xl border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Settings2 className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">功能说明</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-green-50 dark:bg-green-950 rounded-full"></div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">自动生成</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">在指定时间自动创建交易记录</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Pause className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">灵活控制</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">随时暂停或启用固定支出</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">智能防重</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">避免重复生成同一天记录</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">多种频率</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">支持每日、每周、每月等设置</p>
              </div>
            </div>
          </div>
        </div>

        {/* 暂停确认对话框 */}
        {confirmPause && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
              <div className="p-4 border-b dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">确认暂停</h3>
              </div>
              <div className="p-4">
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  确定要暂停固定支出 "{confirmPause.name}" 吗？
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  暂停后将停止自动生成该支出记录，您可以随时重新启用。
                </p>
                {confirmPause.next_generate && (
                  <p className="text-sm text-blue-600 mt-2">
                    下次生成时间：{confirmPause.next_generate}
                  </p>
                )}
              </div>
              <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmPause(null)}
                >
                  取消
                </Button>
                <Button
                  variant="default"
                  onClick={() => confirmPauseExpense(confirmPause)}
                >
                  确认暂停
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 删除确认对话框 */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
              <div className="p-4 border-b dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">确认删除</h3>
              </div>
              <div className="p-4">
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  确定要删除固定支出 "{confirmDelete.name}" 吗？
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  删除后将停止生成该支出记录，此操作不可撤销。
                </p>
              </div>
              <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(null)}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => confirmDeleteExpense(confirmDelete)}
                >
                  确认删除
                </Button>
              </div>
            </div>
          </div>
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