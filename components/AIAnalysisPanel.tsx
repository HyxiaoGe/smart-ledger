'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Lightbulb, ChevronDown, RefreshCw, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeepInsightPanel } from '@/components/DeepInsightPanel';
import { SpendingPredictionPanel } from '@/components/SpendingPredictionPanel';
import { QuickFeedback } from '@/components/ui/AIFeedbackModal';

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
  isModal?: boolean;
}

export function AIAnalysisPanel({
  className = '',
  dateRange = 'current-month',
  categories = [],
  currentMonth = '',
  aiData,
  isModal = false
}: AIAnalysisPanelProps) {
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [advice, setAdvice] = useState<PersonalizedAdvice | null>(null);
  const [currentExpense, setCurrentExpense] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing' | 'success' | 'error'>('idle');
  const [aiSummary, setAiSummary] = useState<string | null>(null);

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
    utilities: '水电费'
  };

  // 处理趋势分析数据
  const processTrendAnalysis = useCallback(() => {
    if (!aiData) return;

    try {
      console.log('处理趋势分析数据:', aiData.currentMonthStr, aiData.lastMonthStr);

      const currentData = aiData.currentMonthFull;
      const lastData = aiData.lastMonth;

      // 过滤掉固定支出（自动生成的交易记录）
      const filteredCurrentData = currentData.filter(t => !t.is_auto_generated && !t.recurring_expense_id);
      const filteredLastData = lastData.filter(t => !t.is_auto_generated && !t.recurring_expense_id);

      // 计算月度总计
      const currentTotal = filteredCurrentData.reduce((sum, t) => sum + t.amount, 0) || 0;
      const lastTotal = filteredLastData.reduce((sum, t) => sum + t.amount, 0) || 0;
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
        ...filteredCurrentData.map(t => t.category),
        ...filteredLastData.map(t => t.category)
      ]);

      allCategories.forEach(category => {
        const current = filteredCurrentData
          .filter(t => t.category === category)
          .reduce((sum, t) => sum + t.amount, 0) || 0;
        const last = filteredLastData
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
        categories: categoryAnalysis
      });

      setCurrentExpense(currentTotal);

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

      // 过滤掉固定支出（自动生成的交易记录）
      const filteredCurrentData = currentData.filter(t => !t.is_auto_generated && !t.recurring_expense_id);

      const totalExpense = filteredCurrentData.reduce((sum, t) => sum + t.amount, 0) || 0;
      const categoryTotals: Record<string, number> = {};

      filteredCurrentData.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

      // 生成建议

      // 生成全面且深入的建议
      const generateAdvancedSuggestions = (currentData: any[]) => {
        const newSuggestions: PersonalizedAdvice['suggestions'] = [];
        const sortedCategories = Object.entries(categoryTotals)
          .sort(([, a], [, b]) => b - a);

        // 1. 高支出类别深入分析
        sortedCategories.slice(0, 3).forEach(([category, amount]) => {
          const percent = (amount / totalExpense) * 100;

          // 基于类别特性的深度建议
          const categoryData = currentData.filter(t => t.category === category);
          const avgAmount = categoryData.length > 0 ? amount / categoryData.length : 0;
          const frequency = categoryData.length;

          let suggestionText = '';
          let potentialSavings = 0;
          let priority: 'high' | 'medium' | 'low' = 'medium';

          // 根据不同类别给出个性化建议
          switch (category) {
            case 'food':
              if (avgAmount > 50 && frequency > 10) {
                suggestionText = `${categoryNames[category]}支出较高(¥${avgAmount.toFixed(0)}/次，${frequency}次)，建议考虑增加在家做饭的频率，可节省约¥${Math.round(amount * 0.25)}`;
                potentialSavings = Math.round(amount * 0.25);
                priority = 'high';
              } else if (percent > 40) {
                suggestionText = `${categoryNames[category]}占比较高(${percent.toFixed(1)}%)，建议优化餐饮结构，减少高价位餐饮消费`;
                potentialSavings = Math.round(amount * 0.15);
                priority = 'medium';
              }
              break;

            case 'transport':
              if (frequency > 15) {
                suggestionText = `${categoryNames[category]}频繁(${frequency}次)，建议考虑公共交通月卡或拼车方案，预计节省¥${Math.round(amount * 0.2)}`;
                potentialSavings = Math.round(amount * 0.2);
                priority = 'medium';
              } else {
                suggestionText = `${categoryNames[category]}支出¥${amount.toFixed(0)}，建议规划路线以减少交通成本`;
                potentialSavings = Math.round(amount * 0.1);
                priority = 'low';
              }
              break;

            case 'shopping':
              suggestionText = `${categoryNames[category]}支出¥${amount.toFixed(0)}(${frequency}次)，建议制定购物清单，避免冲动消费，可节省¥${Math.round(amount * 0.3)}`;
              potentialSavings = Math.round(amount * 0.3);
              priority = 'high';
              break;

            case 'entertainment':
              suggestionText = `${categoryNames[category]}支出¥${amount.toFixed(0)}，建议寻找免费或低价的娱乐活动，预计节省¥${Math.round(amount * 0.4)}`;
              potentialSavings = Math.round(amount * 0.4);
              priority = 'medium';
              break;

            case 'drink':
              const dailyAvg = avgAmount;
              if (dailyAvg > 15 && frequency > 10) {
                suggestionText = `饮品消费较高(¥${dailyAvg.toFixed(0)}/次)，建议减少高价咖啡/奶茶频次，自制饮品可节省¥${Math.round(amount * 0.5)}`;
                potentialSavings = Math.round(amount * 0.5);
                priority = 'high';
              }
              break;

            default:
              if (percent > 30) {
                suggestionText = `${categoryNames[category] || category}支出占比较高(${percent.toFixed(1)}%)，建议审视该类别的必要性和优化空间`;
                potentialSavings = Math.round(amount * 0.15);
                priority = 'medium';
              }
          }

          if (suggestionText) {
            newSuggestions.push({
              category: categoryNames[category] || category,
              suggestion: suggestionText,
              potential: potentialSavings,
              priority
            });
          }
        });

        // 2. 支出模式分析
        const weekdaySpending = currentData.filter(t => {
          const day = new Date(t.date).getDay();
          return day >= 1 && day <= 5; // 周一到周五
        }).reduce((sum, t) => sum + t.amount, 0);

        const weekendSpending = currentData.filter(t => {
          const day = new Date(t.date).getDay();
          return day === 0 || day === 6; // 周末
        }).reduce((sum, t) => sum + t.amount, 0);

        if (weekendSpending > weekdaySpending * 0.6 && currentData.length > 5) {
          newSuggestions.push({
            category: '消费模式',
            suggestion: `周末消费较高(¥${weekendSpending.toFixed(0)})，建议提前规划周末活动预算，避免超支`,
            potential: Math.round(weekendSpending * 0.2),
            priority: 'medium'
          });
        }

        // 3. 预算优化建议
        const dailyAvg = totalExpense / 30;
        if (dailyAvg > 100) {
          newSuggestions.push({
            category: '预算管理',
            suggestion: `日均可变支出¥${dailyAvg.toFixed(0)}偏高，建议设定每日消费上限¥${Math.round(dailyAvg * 0.8)}，强制储蓄`,
            potential: Math.round(totalExpense * 0.15),
            priority: 'high'
          });
        }

        // 4. 消费时机建议
        const highAmountTransactions = currentData.filter(t => t.amount > 100);
        if (highAmountTransactions.length > 0) {
          newSuggestions.push({
            category: '消费时机',
            suggestion: `大额消费(${highAmountTransactions.length}笔)建议提前规划，考虑24小时冷静期规则，避免冲动消费`,
            potential: Math.round(highAmountTransactions.reduce((sum, t) => sum + t.amount, 0) * 0.1),
            priority: 'medium'
          });
        }

        // 5. 储蓄目标建议
        if (newSuggestions.length === 0) {
          newSuggestions.push({
            category: '综合建议',
            suggestion: '您的可变支出结构合理，建议继续保持并考虑增加投资理财比例',
            potential: 0,
            priority: 'low'
          });
        }

        return newSuggestions;
      };

      const suggestions = generateAdvancedSuggestions(filteredCurrentData);

      // 计算推荐的预算和储蓄目标
      const recommendedBudget = Math.round(totalExpense * 0.9); // 建议减少10%
      const suggestedSavings = suggestions.reduce((sum, s) => sum + s.potential, 0);

      setAdvice({
        recommendedBudget,
        suggestedSavings,
        suggestions: suggestions.slice(0, 6) // 限制建议数量
      });

    } catch (error) {
      console.error('处理个性化建议失败:', error);
    }
  }, [aiData, categoryNames]);

  // 调用真正的AI分析接口
  const callAIAnalysis = useCallback(async (transactions: any[]) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth || new Date().toISOString().slice(0, 7),
          transactions: transactions
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🤖 AI分析结果:', result.summary);
        return result.summary;
      } else {
        console.error('AI分析请求失败:', response.status);
        return null;
      }
    } catch (error) {
      console.error('AI分析出错:', error);
      return null;
    }
  }, [currentMonth]);

  // 增强的刷新功能 - 重新获取数据并处理
  const handleRefresh = useCallback(async () => {
    setRefreshStatus('refreshing');
    setLoading(true);

    try {
      // 1. 清除数据缓存，强制重新获取
      const revalidateResponse = await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'transactions' }),
        cache: 'no-store'
      });

      if (revalidateResponse.ok) {
        console.log('✅ 缓存已清除');

        // 2. 调用真正的AI分析
        if (aiData?.currentMonthFull) {
          const aiSummaryResult = await callAIAnalysis(aiData.currentMonthFull);
          if (aiSummaryResult) {
            setAiSummary(aiSummaryResult);
            console.log('🤖 获得AI分析:', aiSummaryResult);
          }
        }

        // 3. 重新处理本地数据（作为补充）
        processTrendAnalysis();
        processPersonalizedAdvice();

        setRefreshStatus('success');
        setTimeout(() => setRefreshStatus('idle'), 2000);
        console.log('✅ AI分析完成');
      } else {
        setRefreshStatus('error');
        setTimeout(() => setRefreshStatus('idle'), 3000);
        console.error('❌ 刷新失败');
      }
    } catch (error) {
      setRefreshStatus('error');
      setTimeout(() => setRefreshStatus('idle'), 3000);
      console.error('❌ 刷新出错:', error);
    } finally {
      setLoading(false);
    }
  }, [processTrendAnalysis, processPersonalizedAdvice, aiData, callAIAnalysis]);

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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">智能财务分析</h2>
        <div className="flex items-center gap-2">
          {/* 刷新状态提示 */}
          <AnimatePresence>
            {refreshStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  refreshStatus === 'refreshing' ? 'bg-blue-100 text-blue-700' :
                  refreshStatus === 'success' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}
              >
                {refreshStatus === 'refreshing' && (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>刷新中...</span>
                  </>
                )}
                {refreshStatus === 'success' && (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    <span>已更新</span>
                  </>
                )}
                {refreshStatus === 'error' && (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    <span>失败</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshStatus === 'refreshing'}
            className="text-gray-500 hover:text-gray-700 hover:bg-blue-50 transition-colors"
            title="清除缓存并重新分析数据"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            AI分析
          </Button>
        </div>
      </div>

      {/* 优化潜力总览 - 顶部醒目展示 */}
      {advice && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">💎 您的财务优化潜力</h3>
              <p className="opacity-90">基于AI分析的可变支出优化建议</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                ¥{advice.suggestions.reduce((sum, s) => sum + s.potential, 0).toFixed(2)}
              </div>
              <div className="text-sm opacity-90">预计月节省</div>
            </div>
          </div>

          <div className={isModal ? "grid grid-cols-4 gap-6" : "grid grid-cols-4 gap-4"}>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <div className={isModal ? "text-2xl font-bold" : "text-xl font-bold"}>
                ¥{advice.suggestions.reduce((sum, s) => sum + s.potential, 0).toFixed(2)}
              </div>
              <div className={isModal ? "text-sm opacity-90" : "text-xs opacity-90"}>月度节省</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <div className={isModal ? "text-2xl font-bold" : "text-xl font-bold"}>
                {advice.suggestions.filter(s => s.priority === 'high').length}
              </div>
              <div className={isModal ? "text-sm opacity-90" : "text-xs opacity-90"}>高优先级</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <div className={isModal ? "text-2xl font-bold" : "text-xl font-bold"}>¥{advice.recommendedBudget.toFixed(2)}</div>
              <div className={isModal ? "text-sm opacity-90" : "text-xs opacity-90"}>建议预算</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <div className={isModal ? "text-2xl font-bold" : "text-xl font-bold"}>
                {currentExpense > 0 ? Math.round((advice.suggestions.reduce((sum, s) => sum + s.potential, 0) / currentExpense) * 100) : 0}%
              </div>
              <div className={isModal ? "text-sm opacity-90" : "text-xs opacity-90"}>优化率</div>
            </div>
          </div>

          <div className="bg-white/20 rounded-lg p-3 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span>执行建议后：¥{currentExpense.toFixed(2)} → ¥{(advice.recommendedBudget - advice.suggestedSavings).toFixed(2)}</span>
              <span className="font-bold">立即开始优化</span>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容区域 - 根据模式选择布局 */}
      <div className={isModal ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
        {/* 左侧：趋势分析 */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => toggleModule('trend')}
          >
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-semibold">
                  可变支出趋势分析
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
                <CardContent className="pt-0">
                  {trendAnalysis ? (
                    <>
                      {/* 月度总览 */}
                      <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">本月可变支出</span>
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
                          <span className={`text-sm font-medium ${
                            trendAnalysis.changePercent >= 0 ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {trendAnalysis.changePercent >= 0 ? '+' : ''}
                            {trendAnalysis.changePercent.toFixed(1)}%
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

        {/* 右侧：智能优化建议 */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => toggleModule('advice')}
          >
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-purple-600" />
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
                  智能优化建议
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
                <CardContent className="pt-0">
                  {advice?.suggestions && advice.suggestions.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {advice.suggestions.slice(0, 3).map((suggestion, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-purple-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {suggestion.category}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {suggestion.priority === 'high' ? '高优先级' :
                                     suggestion.priority === 'medium' ? '中优先级' : '低优先级'}
                                  </span>
                                </div>
                                <div className="text-lg font-bold text-green-600">¥{suggestion.potential.toFixed(2)}</div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  {suggestion.suggestion}
                                </p>
                                <div className="mt-2">
                                  <button
                                    onClick={() => {
                                      setSelectedSuggestion(suggestion);
                                      setShowDetailModal(true);
                                    }}
                                    className="text-xs text-purple-600 hover:text-purple-800"
                                  >
                                    查看详细分析 →
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 查看更多按钮 */}
                      {advice.suggestions.length > 3 && (
                        <div className="text-center pt-2">
                          <button className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                            查看全部 {advice.suggestions.length} 条建议 →
                          </button>
                        </div>
                      )}
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
      </div>

      {/* AI智能分析结果 */}
      {aiSummary && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader
            className="pb-3"
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-green-600" />
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">
                AI智能分析
              </span>
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                DeepSeek
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose prose-sm max-w-none text-sm text-gray-700 leading-relaxed">
              {/* 将Markdown文本转换为HTML显示 */}
              <div
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: aiSummary
                    .replace(/### (.*?)\n/g, '<h3 class="font-semibold text-gray-900 mb-2 mt-3">$1</h3>')
                    .replace(/^- (.*?)\n/g, '<li class="ml-4">• $1</li>')
                    .replace(/1\. (.*?)\n/g, '<li class="ml-4">1. $1</li>')
                    .replace(/2\. (.*?)\n/g, '<li class="ml-4">2. $1</li>')
                    .replace(/3\. (.*?)\n/g, '<li class="ml-4">3. $1</li>')
                    .replace(/\n\n/g, '</p><p class="mb-2">')
                    .replace(/^(?!<[h|l])/g, '<p class="mb-2">')
                    .replace(/(<p[^>]*>)<p/g, '$1') // 修复连续的p标签
                    + '</p>'
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI分析反馈 */}
      {aiSummary && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <QuickFeedback
              featureType="smart_analysis"
              context={{
                analysisType: 'ai_summary',
                dateRange,
                currentMonth,
                hasAnalysis: true
              }}
              className="w-full justify-center"
            />
          </CardContent>
        </Card>
      )}

      {/* 支出预测面板 */}
      <SpendingPredictionPanel
        className="w-full"
        isModal={isModal}
      />

      {/* 深度洞察面板 */}
      <DeepInsightPanel
        dateRange={dateRange}
        currentMonth={currentMonth}
        aiData={aiData}
      />
    </div>
  );
}