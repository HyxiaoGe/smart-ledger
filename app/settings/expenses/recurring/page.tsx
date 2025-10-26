'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Plus,
  Wallet,
  Clock,
  DollarSign,
  Settings2,
  ChevronLeft,
  Pause,
  Play,
  Edit,
  Trash2,
  History
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

  // 手动生成固定支出
  const handleGenerateExpenses = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/recurring-expenses/generate', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('生成固定支出失败');
      }

      const result = await response.json();
      alert(result.message || '生成完成');

      // 重新获取列表
      await fetchRecurringExpenses();
    } catch (error) {
      console.error('生成固定支出失败:', error);
      alert('生成固定支出失败');
    } finally {
      setGenerating(false);
    }
  };

  // 切换启用/禁用状态
  const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('更新状态失败');
      }

      // 重新获取列表
      await fetchRecurringExpenses();
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败');
    }
  };

  // 删除固定支出
  const deleteExpense = async (id: string) => {
    if (!confirm('确定要删除这个固定支出吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      // 重新获取列表
      await fetchRecurringExpenses();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
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
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings/expenses">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4 mr-2" />
                返回消费配置
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="text-gray-500">加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/settings/expenses">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4 mr-2" />
                返回消费配置
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <Button onClick={fetchRecurringExpenses}>重试</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
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

        {/* 页面标题和操作按钮 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">固定支出管理</h2>
            <p className="text-gray-600">设置和管理您的定期固定支出，系统将自动生成记录</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleGenerateExpenses}
              disabled={generating}
              variant="outline"
            >
              <Clock className="h-4 w-4 mr-2" />
              {generating ? '生成中...' : '立即生成'}
            </Button>
            <Link href="/settings/expenses/recurring/add">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                添加固定支出
              </Button>
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                总固定支出
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ¥{recurringExpenses
                  .filter(e => e.is_active)
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {recurringExpenses.filter(e => e.is_active).length} 个活跃项目
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                本月待生成
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {recurringExpenses.filter(e => {
                  if (!e.is_active) return false;
                  const today = new Date().toISOString().split('T')[0];
                  return e.next_generate && e.next_generate <= today;
                }).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                即将自动生成
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <History className="h-4 w-4" />
                已生成
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {recurringExpenses.filter(e => e.last_generated).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                历史生成记录
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 固定支出列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              固定支出列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recurringExpenses.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">还没有设置固定支出</div>
                <Link href="/settings/expenses/recurring/add">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    添加第一个固定支出
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recurringExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className={`p-4 border rounded-lg ${
                      expense.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">
                          {categoryIcons[expense.category as keyof typeof categoryIcons] || '💰'}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{expense.name}</h3>
                          <div className="text-sm text-gray-500">
                            ¥{expense.amount.toFixed(2)} · {frequencyLabels[expense.frequency]}
                            {expense.frequency === 'monthly' && expense.frequency_config.day_of_month &&
                              ` · 每月${expense.frequency_config.day_of_month}号`
                            }
                            {expense.frequency === 'weekly' && expense.frequency_config.days_of_week &&
                              ` · 周${expense.frequency_config.days_of_week.map((d: number) => ['日','一','二','三','四','五','六'][d]).join('、')}`
                            }
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            开始时间: {expense.start_date}
                            {expense.next_generate && (
                              <span className="ml-3">
                                下次生成: {expense.next_generate}
                              </span>
                            )}
                            {expense.last_generated && (
                              <span className="ml-3">
                                上次生成: {expense.last_generated}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActiveStatus(expense.id, expense.is_active)}
                        >
                          {expense.is_active ? (
                            <><Pause className="h-4 w-4 mr-1" /> 暂停</>
                          ) : (
                            <><Play className="h-4 w-4 mr-1" /> 启用</>
                          )}
                        </Button>

                        <Link href={`/settings/expenses/recurring/${expense.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用提示 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">💡 使用提示</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 固定支出会在指定时间自动生成交易记录</li>
            <li>• 可以随时暂停或启用某个固定支出</li>
            <li>• 系统会自动避免重复生成同一天的记录</li>
            <li>• 支持每日、每周、每月等多种频率设置</li>
          </ul>
        </div>
      </div>
    </div>
  );
}