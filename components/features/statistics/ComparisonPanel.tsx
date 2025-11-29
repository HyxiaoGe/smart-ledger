'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Users, ChevronDown, RefreshCw, Award, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAllDataSyncEvents } from '@/hooks/useEnhancedDataSync';
import { transactionsApi } from '@/lib/api/services/transactions';

interface ComparisonData {
  userStats: {
    monthlyAverage: number;
    categoryBreakdown: Record<string, number>;
    spendingStability: number;
    incomeRatio: number;
  };
  peerStats: {
    average: number;
    median: number;
    top10Percent: number;
    bottom10Percent: number;
    categoryAverages: Record<string, number>;
  };
  ranking: {
    position: number;
    percentile: number;
    totalUsers: number;
  };
  insights: Array<{
    type: 'advantage' | 'disadvantage' | 'opportunity';
    title: string;
    description: string;
    comparison: string;
  }>;
}

interface ComparisonPanelProps {
  className?: string;
  currentMonth?: string;
}

export function ComparisonPanel({
  className = '',
  currentMonth = ''
}: ComparisonPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  // 计算月份参数
  const month = currentMonth || new Date().toISOString().slice(0, 7);
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  // 使用 React Query 获取交易数据
  const { data: transactionsData, isLoading: loading, refetch } = useQuery({
    queryKey: ['comparison-transactions', month],
    queryFn: () => transactionsApi.list({
      start_date: startDate,
      end_date: endDate,
      page_size: 1000,
    }),
  });

  // 监听数据同步事件
  useAllDataSyncEvents(() => {
    refetch();
  });

  // 从交易数据计算对比数据
  const data = useMemo<ComparisonData | null>(() => {
    if (!transactionsData) return null;

    const currentData = transactionsData.data || [];
    const expenseData = currentData.filter((t: { type: string }) => t.type === 'expense') || [];
    const incomeData = currentData.filter((t: { type: string }) => t.type === 'income') || [];

    const totalExpense = expenseData.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
    const totalIncome = incomeData.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

    const categoryBreakdown: Record<string, number> = {};
    expenseData.forEach((t: { category: string; amount: number }) => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
    });

    // 模拟同类用户统计数据
    const peerStats = {
      average: 3500,
      median: 3200,
      top10Percent: 8000,
      bottom10Percent: 1200,
      categoryAverages: {
        food: 1200,
        transport: 400,
        housing: 800,
        entertainment: 300,
        shopping: 500,
        utilities: 200,
        healthcare: 200,
        education: 150
      }
    };

    // 计算排名（模拟）
    const allUsers = 1000;
    const sortedExpenses = Array.from({ length: allUsers }, () => {
      return peerStats.average + (Math.random() - 0.5) * 2000;
    }).sort((a, b) => a - b);

    const userRank = sortedExpenses.findIndex(amount => amount >= totalExpense) + 1;
    const percentile = ((allUsers - userRank + 1) / allUsers) * 100;

    // 生成洞察
    const insights: ComparisonData['insights'] = [];

    if (totalExpense < peerStats.average) {
      insights.push({
        type: 'advantage',
        title: '支出控制良好',
        description: '您的支出低于同类用户平均水平',
        comparison: `比平均少¥${(peerStats.average - totalExpense).toFixed(0)}`
      });

      if (percentile <= 25) {
        insights.push({
          type: 'advantage',
          title: '理财能力优秀',
          description: '您处于用户支出最低的25%',
          comparison: '具备较强的储蓄能力'
        });
      }
    } else {
      insights.push({
        type: 'disadvantage',
        title: '支出偏高',
        description: '您的支出高于同类用户平均水平',
        comparison: `比平均多¥${(totalExpense - peerStats.average).toFixed(0)}`
      });

      if (percentile >= 75) {
        insights.push({
          type: 'disadvantage',
          title: '需要注意预算',
          description: '您处于用户支出最高的25%',
          comparison: '建议审视支出结构'
        });
      }
    }

    // 类别对比洞察
    Object.entries(categoryBreakdown).forEach(([category, amount]) => {
      const peerAverage = peerStats.categoryAverages[category as keyof typeof peerStats.categoryAverages] || 0;
      if (Math.abs(amount - peerAverage) > peerAverage * 0.3) {
        insights.push({
          type: 'opportunity',
          title: `${category}类消费`,
          description: `${category}支出${amount > peerAverage ? '偏高' : '偏低'}`,
          comparison: `同类平均: ¥${peerAverage.toFixed(0)}`
        });
      }
    });

    // 储蓄能力分析
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const peerSavingsRate = 25;

    if (savingsRate > peerSavingsRate) {
      insights.push({
        type: 'advantage',
        title: '储蓄能力较强',
        description: `储蓄率${savingsRate.toFixed(1)}%高于平均`,
        comparison: `同类平均: ${peerSavingsRate}%`
      });
    }

    return {
      userStats: {
        monthlyAverage: totalExpense,
        categoryBreakdown,
        spendingStability: 75,
        incomeRatio: totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome * 100 : 0
      },
      peerStats,
      ranking: {
        position: userRank,
        percentile: Math.round(percentile),
        totalUsers: allUsers
      },
      insights: insights.slice(0, 5)
    };
  }, [transactionsData]);

  // 刷新数据
  const refreshData = () => {
    refetch();
  };


  // 获取排名图标
  const getRankingIcon = (percentile: number) => {
    if (percentile >= 90) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (percentile >= 70) return <Award className="h-4 w-4 text-silver" />;
    return <Users className="h-4 w-4 text-gray-400 dark:text-gray-400" />;
  };

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span className="bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent font-semibold">
              同类对比
            </span>
          </div>
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-400" />
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
                  {/* 排名总览 */}
                  <div className="bg-white rounded-lg p-4 border border-yellow-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getRankingIcon(data.ranking.percentile)}
                        <span className="text-sm font-medium text-gray-700">您的排名</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          前{data.ranking.percentile}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {data.ranking.position}/{data.ranking.totalUsers}
                        </div>
                      </div>
                    </div>

                    {/* 对比统计 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">您的支出</div>
                        <div className="text-lg font-bold text-gray-900">
                          ¥{data.userStats.monthlyAverage}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">同类平均</div>
                        <div className="text-lg font-bold text-gray-900">
                          ¥{data.peerStats.average}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">差额:</span>
                      <span className={`text-sm font-medium ${
                        data.userStats.monthlyAverage < data.peerStats.average
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {data.userStats.monthlyAverage < data.peerStats.average ? '节省' : '超支'}
                        ¥{Math.abs(data.userStats.monthlyAverage - data.peerStats.average)}
                      </span>
                    </div>
                  </div>

                  {/* 对比洞察 */}
                  {data.insights.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">对比洞察</div>
                      {data.insights.map((insight, index) => (
                        <div key={index} className="p-3 bg-white rounded border border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                              insight.type === 'advantage' ? 'bg-green-400' :
                              insight.type === 'disadvantage' ? 'bg-red-400' :
                              'bg-blue-400'
                            }`}></div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-800">{insight.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  insight.type === 'advantage' ? 'bg-green-100 text-green-600' :
                                  insight.type === 'disadvantage' ? 'bg-red-100 text-red-600' :
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  {insight.type === 'advantage' ? '优势' :
                                   insight.type === 'disadvantage' ? '注意' : '机会'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{insight.description}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{insight.comparison}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 分类对比 */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">分类对比</div>
                    {Object.entries(data.userStats.categoryBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([category, amount]) => {
                        const peerAmount = data.peerStats.categoryAverages[category] || 0;
                        const difference = amount - peerAmount;
                        const differencePercent = peerAmount > 0 ? (difference / peerAmount) * 100 : 0;

                        return (
                          <div key={category} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {category === 'food' ? '🍽️' :
                                 category === 'transport' ? '🚇' :
                                 category === 'entertainment' ? '🎮' :
                                 category === 'shopping' ? '🛒' :
                                 category === 'housing' ? '🏠' :
                                 category === 'utilities' ? '💡' :
                                 category === 'healthcare' ? '💊' :
                                 category === 'education' ? '📚' : '💰'}
                              </span>
                              <span className="text-sm text-gray-700">{category}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">¥{amount.toFixed(0)}</div>
                              {Math.abs(differencePercent) > 10 && (
                                <div className={`text-xs mt-1 ${
                                  difference < 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {difference < 0 ? <ArrowDown className="h-3 w-3 inline" /> : <ArrowUp className="h-3 w-3 inline" />}
                                  {Math.abs(differencePercent).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* 刷新按钮 */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshData}
                      disabled={loading}
                      className="text-yellow-600 hover:text-yellow-700 border-yellow-200 hover:bg-yellow-50"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                      更新对比
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm">对比分析中...</div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}