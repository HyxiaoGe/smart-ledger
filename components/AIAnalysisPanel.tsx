'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Lightbulb, ChevronDown, RefreshCw, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeepInsightPanel } from '@/components/DeepInsightPanel';

interface TrendAnalysis {
  currentMonth: number;
  lastMonth: number;
  changePercent: number;
  changeAmount: number;
  categories: Array<{
    category: string;
    current: number;
    last: number;
    changePercent: number;
    icon: string;
  }>;
}

interface PersonalizedAdvice {
  recommendedBudget: number;
  suggestedSavings: number;
  suggestions: Array<{
    category: string;
    suggestion: string;
    potential: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface AIAnalysisPanelProps {
  className?: string;
  dateRange?: string;
  categories?: string[];
  currentMonth?: string;
  aiData?: {
    currentMonthFull: any[];
    lastMonth: any[];
    currentMonthTop20: any[];
    currentMonthStr: string;
    lastMonthStr: string;
  };
}

export function AIAnalysisPanel({
  className = '',
  dateRange = 'current-month',
  categories = [],
  currentMonth = '',
  aiData
}: AIAnalysisPanelProps) {
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [advice, setAdvice] = useState<PersonalizedAdvice | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // 类别名称中文翻译 - 组件级别定义
  const categoryNames: Record<string, string> = {
    food: '餐饮',
    transport: '交通',
    drink: '饮品',
    daily: '日用品',
    subscription: '订阅服务',
    entertainment: '娱乐',
    medical: '医疗',
    education: '教育',
    rent: '房租',
    other: '其他',
    shopping: '购物',
    utilities: '水电费',
    salary: '工资',
    bonus: '奖金',
    investment: '投资'
  };

  // 处理趋势分析数据 (基于传入的aiData)
  const processTrendAnalysis = useCallback(() => {
    if (!aiData) return;

    try {
      console.log('处理趋势分析数据:', aiData.currentMonthStr, aiData.lastMonthStr);

      const currentData = aiData.currentMonthFull;
      const lastData = aiData.lastMonth;

      // 计算月度总计
      const currentTotal = currentData.reduce((sum, t) => sum + t.amount, 0) || 0;
      const lastTotal = lastData.reduce((sum, t) => sum + t.amount, 0) || 0;
      const changeAmount = currentTotal - lastTotal;
      const changePercent = lastTotal > 0 ? (changeAmount / lastTotal) * 100 : 0;

      // 按分类聚合数据
      const categoryIcons: Record<string, string> = {
        food: '🍽️',
        transport: '🚇',
        drink: '☕',
        daily: '🛍️',
        subscription: '📱',
        entertainment: '🎮',
        medical: '💊',
        education: '📚',
        rent: '🏠',
        other: '📦',
        shopping: '🛒',
        utilities: '💡',
        salary: '💰',
        bonus: '🎁',
        investment: '📈'
      };

      const categoryAnalysis: TrendAnalysis['categories'] = [];

      const allCategories = new Set([
        ...currentData.map(t => t.category),
        ...lastData.map(t => t.category)
      ]);

      allCategories.forEach(category => {
        const current = currentData
          .filter(t => t.category === category)
          .reduce((sum, t) => sum + t.amount, 0) || 0;
        const last = lastData
          .filter(t => t.category === category)
          .reduce((sum, t) => sum + t.amount, 0) || 0;
        const categoryChange = last > 0 ? ((current - last) / last) * 100 : 0;

        categoryAnalysis.push({
          category,
          current,
          last,
          changePercent: categoryChange,
          icon: categoryIcons[category] || '💰'
        });
      });

      setTrendAnalysis({
        currentMonth: currentTotal,
        lastMonth: lastTotal,
        changePercent,
        changeAmount,
        categories: categoryAnalysis.sort((a, b) => b.current - a.current).slice(0, 5)
      });

    } catch (error) {
      console.error('处理趋势分析失败:', error);
    }
  }, [aiData]);

  // 处理个性化建议数据 (基于传入的aiData)
  const processPersonalizedAdvice = useCallback(() => {
    if (!aiData) return;

    try {
      console.log('处理个性化建议数据');

      const top20Data = aiData.currentMonthTop20;
      const currentData = aiData.currentMonthFull;

      const totalExpense = currentData.reduce((sum, t) => sum + t.amount, 0) || 0;
      const categoryTotals: Record<string, number> = {};

      currentData.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

      // 生成建议
      const suggestions: PersonalizedAdvice['suggestions'] = [];

      // 高支出类别建议
      Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .forEach(([category, amount]) => {
          const percent = (amount / totalExpense) * 100;
          if (percent > 30) {
            suggestions.push({
              category,
              suggestion: `${categoryNames[category] || category}支出占比较高(${percent.toFixed(1)}%)，建议控制消费频率`,
              potential: Math.round(amount * 0.2),
              priority: 'high'
            });
          }
        });

      // 预算建议
      const recommendedBudget = Math.round(totalExpense * 1.1); // 当前支出的110%
      const suggestedSavings = Math.round(totalExpense * 0.1); // 建议储蓄10%

      if (suggestions.length === 0) {
        suggestions.push({
          category: 'general',
          suggestion: '您的消费结构较为合理，建议继续保持',
          potential: 0,
          priority: 'low'
        });
      }

      setAdvice({
        recommendedBudget,
        suggestedSavings,
        suggestions: suggestions.slice(0, 4)
      });

    } catch (error) {
      console.error('处理个性化建议失败:', error);
    }
  }, [aiData, categoryNames]);

  // 处理数据
  const processData = useCallback(() => {
    setLoading(true);
    processTrendAnalysis();
    processPersonalizedAdvice();
    setLoading(false);
  }, [processTrendAnalysis, processPersonalizedAdvice]);

  // 初始化加载 - 只在组件挂载时执行一次
  useEffect(() => {
    if (aiData) {
      processData();
    }
  }, [aiData]);

  // 切换模块折叠状态
  const toggleModule = (moduleId: string) => {
    setCollapsedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 刷新按钮 */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={processData}
          disabled={loading}
          className="text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 趋势分析模块 */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader
          className="pb-3 cursor-pointer"
          onClick={() => toggleModule('trend')}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-semibold">
                消费趋势分析
              </span>
            </div>
            <motion.div
              animate={{ rotate: collapsedModules['trend'] ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </motion.div>
          </CardTitle>
        </CardHeader>

        <AnimatePresence>
          {!collapsedModules['trend'] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 space-y-4">
                {trendAnalysis ? (
                  <>
                    {/* 月度总览 */}
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">本月支出</span>
                        <span className="text-2xl font-bold text-gray-900">
                          ¥{trendAnalysis.currentMonth.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {trendAnalysis.changePercent >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                        <span className={`text-sm ${
                          trendAnalysis.changePercent >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {trendAnalysis.changePercent >= 0 ? '+' : ''}
                          {trendAnalysis.changePercent.toFixed(1)}% vs上月
                        </span>
                        <span className="text-xs text-gray-500">
                          (¥{Math.abs(trendAnalysis.changeAmount).toFixed(0)})
                        </span>
                      </div>
                    </div>

                    {/* 分类趋势 */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">主要类别趋势</div>
                      {trendAnalysis.categories.map((category, index) => (
                        <div key={category.category} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{category.icon}</span>
                            <span className="text-sm text-gray-700">{categoryNames[category.category] || category.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">¥{category.current.toFixed(0)}</span>
                            {category.changePercent !== 0 && (
                              <span className={`text-xs px-1 rounded ${
                                category.changePercent > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                              }`}>
                                {category.changePercent > 0 ? '+' : ''}
                                {category.changePercent.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <div className="text-sm">分析中...</div>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 个性化建议模块 */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader
          className="pb-3 cursor-pointer"
          onClick={() => toggleModule('advice')}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
                个性化建议
              </span>
            </div>
            <motion.div
              animate={{ rotate: collapsedModules['advice'] ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </motion.div>
          </CardTitle>
        </CardHeader>

        <AnimatePresence>
          {!collapsedModules['advice'] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 space-y-4">
                {advice ? (
                  <>
                    {/* 预算和储蓄建议 */}
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-gray-500">建议月预算</div>
                          <div className="text-lg font-bold text-purple-600">
                            ¥{advice.recommendedBudget}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">目标储蓄</div>
                          <div className="text-lg font-bold text-pink-600">
                            ¥{advice.suggestedSavings}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 具体建议 */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">优化建议</div>
                      {advice.suggestions.map((suggestion, index) => (
                        <div key={index} className="p-3 bg-white rounded border border-gray-100">
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-sm text-gray-800">{suggestion.suggestion}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              suggestion.priority === 'high'
                                ? 'bg-red-100 text-red-600'
                                : suggestion.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {suggestion.priority === 'high' ? '重要' :
                               suggestion.priority === 'medium' ? '一般' : '参考'}
                            </span>
                          </div>
                          {suggestion.potential > 0 && (
                            <div className="text-xs text-gray-500">
                              预计节省：¥{suggestion.potential}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <div className="text-sm">分析中...</div>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 额外分析面板 */}
      <DeepInsightPanel
        dateRange={dateRange}
        currentMonth={currentMonth}
        aiData={aiData}
      />
    </div>
  );
}