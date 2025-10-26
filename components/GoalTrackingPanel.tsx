'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, TrendingDown, ChevronDown, RefreshCw, Trophy, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useDataSync } from '@/lib/dataSync';

interface Goal {
  id: string;
  type: 'savings' | 'expense_limit' | 'category_budget';
  title: string;
  targetAmount: number;
  currentAmount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface GoalTrackingData {
  goals: Goal[];
  overallProgress: {
    totalGoals: number;
    completedGoals: number;
    onTrackGoals: number;
    atRiskGoals: number;
  };
  currentMonthSavings: number;
  monthlyIncome?: number;
}

interface GoalTrackingPanelProps {
  className?: string;
  currentMonth?: string;
}

export function GoalTrackingPanel({
  className = '',
  currentMonth = ''
}: GoalTrackingPanelProps) {
  const [data, setData] = useState<GoalTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // 监听数据同步事件
  useDataSync(() => {
    fetchGoalData();
  });

  // 获取目标数据
  const fetchGoalData = async () => {
    try {
      const month = currentMonth || new Date().toISOString().slice(0, 7);
      const currentDate = new Date();
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      const dayOfMonth = currentDate.getDate();
      const progressPercent = (dayOfMonth / daysInMonth) * 100;

      // 获取当前月收入数据（如果有）
      const { data: incomeData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('date', 'like', `${month}%`)
        .eq('type', 'income')
        .is('deleted_at', null);

      const monthlyIncome = incomeData?.reduce((sum, t) => sum + t.amount, 0);

      // 获取当前月支出数据
      const { data: expenseData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('date', 'like', `${month}%`)
        .eq('type', 'expense')
        .is('deleted_at', null);

      const currentMonthExpense = expenseData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // 计算当前月储蓄（收入 - 支出）
      const currentMonthSavings = monthlyIncome - currentMonthExpense;

      // 生成默认目标（基于当前数据）
      const defaultGoals: Goal[] = [
        {
          id: 'monthly-savings',
          type: 'savings',
          title: '月度储蓄目标',
          targetAmount: Math.round((monthlyIncome || 5000) * 0.2), // 默认储蓄率20%
          currentAmount: Math.max(0, currentMonthSavings),
          period: 'monthly',
          startDate: month + '-01',
          endDate: month + '-31',
          isCompleted: false,
          priority: 'high'
        },
        {
          id: 'expense-control',
          type: 'expense_limit',
          title: '支出控制目标',
          targetAmount: Math.round((monthlyIncome || 5000) * 0.8), // 默认支出不超过80%
          currentAmount: currentMonthExpense,
          period: 'monthly',
          startDate: month + '-01',
          endDate: month + '-31',
          isCompleted: false,
          priority: 'high'
        },
        {
          id: 'food-budget',
          type: 'category_budget',
          title: '餐饮预算',
          targetAmount: 1500,
          currentAmount: 0,
          period: 'monthly',
          startDate: month + '-01',
          endDate: month + '-31',
          isCompleted: false,
          priority: 'medium'
        },
        {
          id: 'transport-budget',
          type: 'category_budget',
          title: '交通预算',
          targetAmount: 500,
          currentAmount: 0,
          period: 'monthly',
          startDate: month + '-01',
          endDate: month + '-31',
          isCompleted: false,
          priority: 'medium'
        }
      ];

      // 计算分类当前支出
      const categoryExpenses = new Map<string, number>();
      expenseData?.forEach(t => {
        // 这里需要从交易数据中获取分类信息
        // 暂时使用模拟数据
        if (t.amount < 50) categoryExpenses.set('food', (categoryExpenses.get('food') || 0) + t.amount);
        if (t.amount < 30) categoryExpenses.set('transport', (categoryExpenses.get('transport') || 0) + t.amount);
      });

      // 更新分类目标
      defaultGoals.forEach(goal => {
        if (goal.type === 'category_budget') {
          if (goal.title === '餐饮预算') {
            goal.currentAmount = categoryExpenses.get('food') || 0;
          } else if (goal.title === '交通预算') {
            goal.currentAmount = categoryExpenses.get('transport') || 0;
          }
        }

        // 检查目标是否完成
        goal.isCompleted = goal.currentAmount <= goal.targetAmount;
      });

      // 计算整体进度
      const completedGoals = defaultGoals.filter(g => g.isCompleted).length;
      const onTrackGoals = defaultGoals.filter(g => !g.isCompleted && (g.currentAmount / g.targetAmount) <= (progressPercent / 100)).length;
      const atRiskGoals = defaultGoals.length - completedGoals - onTrackGoals;

      setData({
        goals: defaultGoals,
        overallProgress: {
          totalGoals: defaultGoals.length,
          completedGoals,
          onTrackGoals,
          atRiskGoals
        },
        currentMonthSavings,
        monthlyIncome
      });

    } catch (error) {
      console.error('获取目标数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const refreshData = () => {
    setLoading(true);
    fetchGoalData();
  };

  useEffect(() => {
    fetchGoalData();
  }, [currentMonth]);

  // 获取进度条颜色
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 获取状态图标
  const getStatusIcon = (goal: Goal) => {
    if (goal.isCompleted) return <Trophy className="h-4 w-4 text-green-500" />;
    if (goal.currentAmount <= goal.targetAmount) return <TrendingUp className="h-4 w-4 text-blue-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  // 获取状态文本
  const getStatusText = (goal: Goal) => {
    if (goal.isCompleted) return '已完成';
    const percentage = Math.round((goal.currentAmount / goal.targetAmount) * 100);
    if (percentage <= 100) return `进行中 (${percentage}%)`;
    return `超支 (${percentage}%)`;
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">
              目标追踪
            </span>
          </div>
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </motion.div>
        </CardTitle>
      </CardHeader>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 space-y-4">
              {data ? (
                <>
                  {/* 整体进度概览 */}
                  <div className="bg-white rounded-lg p-4 border border-green-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">完成进度</div>
                        <div className="text-lg font-bold text-green-600">
                          {data.overallProgress.completedGoals}/{data.overallProgress.totalGoals}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">月度储蓄</div>
                        <div className="text-lg font-bold text-emerald-600">
                          ¥{data.currentMonthSavings}
                        </div>
                      </div>
                    </div>

                    {/* 进度指示器 */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">进行中: {data.overallProgress.onTrackGoals}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">风险中: {data.overallProgress.atRiskGoals}</span>
                      </div>
                    </div>
                  </div>

                  {/* 目标列表 */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">当前目标</div>
                    {data.goals.map((goal) => {
                      const percentage = Math.round((goal.currentAmount / goal.targetAmount) * 100);
                      const displayPercentage = Math.min(percentage, 100);

                      return (
                        <div key={goal.id} className="p-3 bg-white rounded border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(goal)}
                              <div>
                                <div className="text-sm font-medium text-gray-800">{goal.title}</div>
                                <div className="text-xs text-gray-500">{getStatusText(goal)}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500 mb-1">
                                ¥{goal.currentAmount.toLocaleString()}
                              </div>
                              <div className="text-sm font-medium">
                                / ¥{goal.targetAmount.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* 进度条 */}
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className={`h-2 rounded-full ${getProgressColor(displayPercentage)}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${displayPercentage}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 储蓄建议 */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">储蓄建议</span>
                      </div>
                      <span className="text-sm text-green-600">
                        目标完成率 {Math.round((data.overallProgress.completedGoals / data.overallProgress.totalGoals) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* 刷新按钮 */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshData}
                      disabled={loading}
                      className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                      刷新目标
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm">目标加载中...</div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}