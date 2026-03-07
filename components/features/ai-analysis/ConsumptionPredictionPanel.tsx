'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart, ChevronDown, RefreshCw, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAllDataSyncEvents } from '@/hooks/useEnhancedDataSync';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactionRows } from '@/lib/api/hooks/useTransactions';

interface CategoryPrediction {
  category: string;
  currentAmount: number;
  predictedAmount: number;
  remainingDays: number;
  confidence: number;
  icon: string;
}

interface ConsumptionPredictionData {
  currentMonthTotal: number;
  predictedMonthTotal: number;
  accuracy: number;
  predictions: CategoryPrediction[];
  dailyAverage: number;
  monthlyBudget?: number;
}

interface ConsumptionPredictionPanelProps {
  className?: string;
  dateRange?: string;
  currentMonth?: string;
}

export function ConsumptionPredictionPanel({
  className = '',
  dateRange = 'current-month',
  currentMonth = ''
}: ConsumptionPredictionPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const categoryIcons: Record<string, string> = {
    food: '🍽️',
    transport: '🚇',
    drink: '☕',
    daily: '🛍️',
    subscription: '📱',
    entertainment: '🎮',
    medical: '💊',
    education: '📚',
    shopping: '🛒'
  };

  // 使用 React Query 获取消费预测数据
  const {
    data,
    isLoading: loading,
    refetch
  } = useQuery({
    queryKey: ['consumption-prediction', dateRange, currentMonth],
    queryFn: async (): Promise<ConsumptionPredictionData> => {
      const month = currentMonth || new Date().toISOString().slice(0, 7);
      const currentDate = new Date();
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      const daysPassed = currentDate.getDate();
      const remainingDays = daysInMonth - daysPassed;

      // 获取当前月数据
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      const currentData = await fetchTransactionRows({
        start_date: startDate,
        end_date: endDate,
        type: 'expense',
        page_size: 1000
      });

      // 获取历史数据用于预测
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().slice(0, 7);
      const twoMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1).toISOString().slice(0, 7);

      const [lastMonthData, twoMonthsAgoData] = await Promise.all([
        fetchTransactionRows({
          start_date: `${lastMonth}-01`,
          end_date: `${lastMonth}-31`,
          type: 'expense',
          page_size: 1000
        }),
        fetchTransactionRows({
          start_date: `${twoMonthsAgo}-01`,
          end_date: `${twoMonthsAgo}-31`,
          type: 'expense',
          page_size: 1000
        })
      ]);

      // 计算当前月总支出
      const currentMonthTotal = currentData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // 按分类聚合数据
      const categoryMap = new Map<string, number>();
      currentData?.forEach(t => {
        categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
      });

      // 基于历史数据预测
      const predictions: CategoryPrediction[] = [];
      let predictedTotal = 0;

      // 获取历史类别平均值
      const lastMonthTotals = new Map<string, number>();
      lastMonthData?.forEach(t => {
        lastMonthTotals.set(t.category, (lastMonthTotals.get(t.category) || 0) + t.amount);
      });

      const twoMonthsAgoTotals = new Map<string, number>();
      twoMonthsAgoData?.forEach(t => {
        twoMonthsAgoTotals.set(t.category, (twoMonthsAgoTotals.get(t.category) || 0) + t.amount);
      });

      categoryMap.forEach((currentAmount, category) => {
        const lastMonthAmount = lastMonthTotals.get(category) || 0;
        const twoMonthsAgoAmount = twoMonthsAgoTotals.get(category) || 0;

        // 计算历史平均值和趋势
        const historicalAvg = (lastMonthAmount + twoMonthsAgoAmount) / 2;
        const trend = lastMonthAmount > twoMonthsAgoAmount ? 1.05 : 0.98;

        // 计算日均和预测
        const dailyAverage = currentAmount / daysPassed;
        const predictedAmount = dailyAverage * daysInMonth * trend;

        // 计算置信度
        const variance = Math.abs(lastMonthAmount - twoMonthsAgoAmount) / (historicalAvg || 1);
        const confidence = Math.max(60, Math.min(95, 100 - variance * 10));

        predictions.push({
          category,
          currentAmount,
          predictedAmount: Math.round(predictedAmount),
          remainingDays,
          confidence: Math.round(confidence),
          icon: categoryIcons[category] || '💰'
        });

        predictedTotal += predictedAmount;
      });

      // 计算预测准确度
      const accuracy = predictions.length > 0
        ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
        : 85;

      // 计算日均支出
      const dailyAverage = currentMonthTotal / daysPassed;

      return {
        currentMonthTotal,
        predictedMonthTotal: Math.round(predictedTotal),
        accuracy: Math.round(accuracy),
        predictions: predictions.sort((a, b) => b.predictedAmount - a.predictedAmount).slice(0, 5),
        dailyAverage: Math.round(dailyAverage)
      };
    }
  });

  // 监听数据同步事件
  useAllDataSyncEvents(() => {
    refetch();
  });

  // 刷新数据
  const refreshData = () => {
    refetch();
  };

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-600" />
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent font-semibold">
              消费预测
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
                  {/* 预测总览 */}
                  <div className="bg-white rounded-lg p-4 border border-amber-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-300">预计本月支出</span>
                      <span className="text-2xl font-bold text-gray-900">
                        ¥{data.predictedMonthTotal}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <BarChart className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-gray-700">当前: ¥{data.currentMonthTotal}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">预测准确度:</span>
                        <span className="text-xs font-semibold text-amber-600">{data.accuracy}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 分类预测 */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">主要类别预测</div>
                    {data.predictions.map((prediction) => (
                      <div key={prediction.category} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{prediction.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-800">{prediction.category}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              当前: ¥{prediction.currentAmount} | 预测: ¥{prediction.predictedAmount}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {prediction.remainingDays}天剩余
                          </div>
                          <div className={`text-xs px-1.5 py-0.5 rounded ${
                            prediction.confidence >= 85 ? 'bg-green-100 text-green-600' :
                            prediction.confidence >= 70 ? 'bg-yellow-100 text-yellow-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {prediction.confidence}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 日均预测 */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-gray-700">日均支出</span>
                      </div>
                      <span className="text-lg font-bold text-amber-600">
                        ¥{data.dailyAverage}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <BarChart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm">预测分析中...</div>
                </div>
              )}

              {/* 刷新按钮 */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={loading}
                  className="text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  刷新预测
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
