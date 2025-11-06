'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, ChevronDown, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InsightPattern {
  id: string;
  type: 'weekend_peak' | 'daily_routine' | 'subscription_growth' | 'spending_pattern';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  recommendation: string;
  icon: string;
}

interface SpendingPattern {
  peakHours: number[];
  commonCategories: Array<{ category: string; amount: number; frequency: number }>;
  weekendVsWeekday: { weekend: number; weekday: number; ratio: number };
  merchantFrequency: Array<{ merchant: string; count: number; totalAmount: number }>;
  averageAmounts: Record<string, number>;
  spendingStability: number;
}

interface HabitScore {
  overall: number;
  predictability: number;
  diversity: number;
  regularity: number;
  description: string;
  improvements: string[];
}

interface DeepInsightData {
  patterns: InsightPattern[];
  spendingAnalysis: SpendingPattern;
  habitScore: HabitScore;
  monthlyTrends: {
    category: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    changeRate: number;
  }[];
}

interface DeepInsightPanelProps {
  className?: string;
  dateRange?: string;
  currentMonth?: string;
  aiData?: {
    currentMonthFull: any[];
    lastMonth: any[];
    currentMonthTop20: any[];
    currentMonthStr: string;
    lastMonthStr: string;
  };
}

export function DeepInsightPanel({
  className = '',
  dateRange = 'current-month',
  currentMonth = '',
  aiData
}: DeepInsightPanelProps) {
  const [data, setData] = useState<DeepInsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // 生成习惯评分
  const calculateHabitScore = (
    spendingAnalysis: SpendingPattern,
    patterns: InsightPattern[]
  ): HabitScore => {
    let predictability = 80; // 基础分数
    let diversity = 70;
    let regularity = 60;

    // 基于消费高峰时段调整预测性
    if (spendingAnalysis.peakHours.length > 0) {
      predictability += Math.min(20, spendingAnalysis.peakHours.length * 5);
    }

    // 基于类别分布调整多样性
    const categoryCount = spendingAnalysis.commonCategories.length;
    diversity = Math.min(100, categoryCount * 15);

    // 基于周末消费模式调整规律性
    if (spendingAnalysis.weekendVsWeekday.ratio > 0.3 && spendingAnalysis.weekendVsWeekday.ratio < 0.7) {
      regularity += 20;
    }

    // 基于稳定性调整
    regularity = Math.min(100, regularity + spendingAnalysis.spendingStability * 0.2);

    const overall = Math.round((predictability + diversity + regularity) / 3);

    let description = '';
    let improvements: string[] = [];

    if (overall >= 80) {
      description = '您的可变支出习惯非常稳定和规律';
      improvements = ['继续保持良好的消费习惯', '定期回顾和优化可变支出预算'];
    } else if (overall >= 60) {
      description = '您的可变支出习惯较为规律，还有改进空间';
      improvements = ['尝试制定更详细的消费计划', '减少冲动消费'];
    } else {
      description = '您的可变支出习惯需要更多规划和规范';
      improvements = ['建议制定严格的可变支出预算计划', '记录每笔消费并定期分析'];
    }

    return {
      overall,
      predictability: Math.round(predictability),
      diversity: Math.round(diversity),
      regularity: Math.round(regularity),
      description,
      improvements
    };
  };

  // 分析月度趋势
  const analyzeMonthlyTrends = (
    currentData: Record<string, { amount: number; count: number }>,
    lastMonthData: any[]
  ) => {
    const trends: DeepInsightData['monthlyTrends'] = [];

    // 分析每个类别的趋势
    Object.keys(currentData).forEach(category => {
      const currentAmount = currentData[category].amount;
      const lastMonthAmount = lastMonthData
        ?.filter(t => t.category === category)
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      if (lastMonthAmount > 0) {
        const changeRate = ((currentAmount - lastMonthAmount) / lastMonthAmount) * 100;
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

        if (changeRate > 10) {
          trend = 'increasing';
        } else if (changeRate < -10) {
          trend = 'decreasing';
        }

        trends.push({
          category,
          trend,
          changeRate: Math.round(changeRate * 10) / 10
        });
      }
    });

    return trends.sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate)).slice(0, 5);
  };

  // 分析消费模式 (基于传入的aiData)
  const analyzeSpendingPatterns = useCallback(() => {
    if (!aiData) return;

    try {
      console.log('分析消费模式数据:', aiData.currentMonthStr, aiData.lastMonthStr);

      const currentData = aiData.currentMonthFull;
      const lastMonthData = aiData.lastMonth;

      // 过滤掉固定支出（自动生成的交易记录）
      const filteredCurrentData = currentData.filter(t => !t.is_auto_generated && !t.recurring_expense_id);
      const filteredLastMonthData = lastMonthData.filter(t => !t.is_auto_generated && !t.recurring_expense_id);

      console.log('处理的数据:', {
        currentDataCount: filteredCurrentData.length || 0,
        lastMonthDataCount: filteredLastMonthData.length || 0
      });

      // 分析支出模式
      const spendingAnalysis: SpendingPattern = {
        peakHours: [],
        commonCategories: [],
        weekendVsWeekday: { weekend: 0, weekday: 0, ratio: 0 },
        merchantFrequency: [],
        averageAmounts: {},
        spendingStability: 0
      };

      // 分析时间分布
      const hourlyData: Record<number, number> = {};
      const categoryData: Record<string, { amount: number; count: number }> = {};
      const merchantData: Record<string, { count: number; amount: number }> = {};

      if (!filteredCurrentData || filteredCurrentData.length === 0) {
        console.log('没有找到当月消费数据');
        setData(null);
        return;
      }

      filteredCurrentData.forEach(transaction => {
        // 分析小时分布
        const date = new Date(transaction.date);
        const hour = date.getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + transaction.amount;

        // 分析类别分布
        if (!categoryData[transaction.category]) {
          categoryData[transaction.category] = { amount: 0, count: 0 };
        }
        categoryData[transaction.category].amount += transaction.amount;
        categoryData[transaction.category].count += 1;

        // 分析商家频率 (如果有note字段)
        if (transaction.note) {
          const merchant = transaction.note.trim();
          if (!merchantData[merchant]) {
            merchantData[merchant] = { count: 0, amount: 0 };
          }
          merchantData[merchant].count += 1;
          merchantData[merchant].amount += transaction.amount;
        }
      });

      // 找出消费高峰时段
      spendingAnalysis.peakHours = Object.entries(hourlyData)
        .map(([hour, amount]) => ({ hour: parseInt(hour), amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
        .map(item => item.hour);

      // 找出常见消费类别
      spendingAnalysis.commonCategories = Object.entries(categoryData)
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          frequency: data.count
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // 分析周末vs工作日消费
      currentData.forEach(transaction => {
        const date = new Date(transaction.date);
        const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          spendingAnalysis.weekendVsWeekday.weekend += transaction.amount;
        } else {
          spendingAnalysis.weekendVsWeekday.weekday += transaction.amount;
        }
      });

      const total = spendingAnalysis.weekendVsWeekday.weekend + spendingAnalysis.weekendVsWeekday.weekday;
      spendingAnalysis.weekendVsWeekday.ratio = total > 0 ? spendingAnalysis.weekendVsWeekday.weekend / total : 0;

      // 计算各类别平均金额
      Object.entries(categoryData).forEach(([category, data]) => {
        spendingAnalysis.averageAmounts[category] = data.amount / data.count;
      });

      // 计算消费稳定性 (基于金额分布的标准差)
      const amounts = Object.values(categoryData).map(data => data.amount);
      const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      spendingAnalysis.spendingStability = Math.max(0, 100 - (stdDev / mean) * 100);

      // 生成洞察模式
      const patterns: InsightPattern[] = [];

      // 1. 周末消费模式深度分析
      const weekendRatio = spendingAnalysis.weekendVsWeekday.ratio;
      if (weekendRatio > 0.6) {
        patterns.push({
          id: 'weekend_heavy',
          type: 'weekend_peak',
          title: '周末消费主导',
          description: `周末消费占比${(weekendRatio * 100).toFixed(1)}%，明显高于工作日`,
          impact: weekendRatio > 0.8 ? 'high' : 'medium',
          confidence: 90,
          recommendation: '建议设定周末消费预算，工作日提前规划周末活动以控制支出',
          icon: '🎉'
        });
      } else if (weekendRatio < 0.2 && filteredCurrentData.length > 10) {
        patterns.push({
          id: 'weekday_heavy',
          type: 'spending_pattern',
          title: '工作日消费集中',
          description: `工作日消费占主导(${((1-weekendRatio) * 100).toFixed(1)}%)，可能与工作相关支出较多`,
          impact: 'low',
          confidence: 75,
          recommendation: '审视工作日支出的必要性，考虑是否有更经济的替代方案',
          icon: '💼'
        });
      }

      // 2. 消费频次和金额模式分析
      const avgTransactionAmount = filteredCurrentData.length > 0
        ? filteredCurrentData.reduce((sum, t) => sum + t.amount, 0) / filteredCurrentData.length
        : 0;

      if (avgTransactionAmount > 100) {
        patterns.push({
          id: 'high_ticket_spending',
          type: 'spending_pattern',
          title: '大额消费倾向',
          description: `平均单笔消费¥${avgTransactionAmount.toFixed(0)}，倾向于高客单价消费`,
          impact: 'medium',
          confidence: 85,
          recommendation: '建议对大额消费设置24小时冷静期，优先考虑性价比和替代方案',
          icon: '💰'
        });
      } else if (filteredCurrentData.length > 50 && avgTransactionAmount < 30) {
        patterns.push({
          id: 'frequent_small_spending',
          type: 'spending_pattern',
          title: '小额高频消费',
          description: `${filteredCurrentData.length}笔交易，平均¥${avgTransactionAmount.toFixed(0)}，小额消费频繁`,
          impact: 'medium',
          confidence: 90,
          recommendation: '小额消费累积效应明显，建议记录每笔支出，设定日消费上限',
          icon: '☕'
        });
      }

      // 3. 消费多样性分析
      const categoryCount = spendingAnalysis.commonCategories.length;
      if (categoryCount > 8) {
        patterns.push({
          id: 'diverse_spending',
          type: 'spending_pattern',
          title: '消费类别分散',
          description: `涉及${categoryCount}个消费类别，消费兴趣广泛`,
          impact: 'low',
          confidence: 80,
          recommendation: '消费多样化有助于生活质量，建议关注核心类别的高效管理',
          icon: '🎨'
        });
      } else if (categoryCount < 4 && filteredCurrentData.length > 5) {
        patterns.push({
          id: 'concentrated_spending',
          type: 'spending_pattern',
          title: '消费类别集中',
          description: `主要集中在${categoryCount}个类别，消费偏好明显`,
          impact: 'low',
          confidence: 85,
          recommendation: '在核心消费类别中寻求优化机会，探索更高性价比的选择',
          icon: '🎯'
        });
      }

      // 4. 消费稳定性深度分析
      const stability = spendingAnalysis.spendingStability;
      if (stability > 85) {
        patterns.push({
          id: 'highly_stable',
          type: 'spending_pattern',
          title: '消费习惯高度稳定',
          description: `消费稳定性评分${stability.toFixed(0)}分，月度支出波动很小`,
          impact: 'low',
          confidence: 95,
          recommendation: '稳定的消费习惯有利于财务规划，建议在此基础上优化消费结构，提升消费价值',
          icon: '📊'
        });
      } else if (stability < 50 && filteredCurrentData.length > 10) {
        patterns.push({
          id: 'volatile_spending',
          type: 'spending_pattern',
          title: '消费波动较大',
          description: `消费稳定性评分${stability.toFixed(0)}分，月度支出波动明显`,
          impact: 'medium',
          confidence: 85,
          recommendation: '建议建立应急基金应对消费波动，同时分析波动原因并制定更稳定的消费计划',
          icon: '📈'
        });
      }

      // 5. 订阅服务分析（保留原有逻辑）
      const subscriptionCategories = ['subscription', 'membership', 'software'];
      const subscriptionSpending = spendingAnalysis.commonCategories
        .filter(cat => subscriptionCategories.some(sub => cat.category.includes(sub)))
        .reduce((sum, cat) => sum + cat.amount, 0);

      if (subscriptionSpending > 500) {
        patterns.push({
          id: 'subscription_growth',
          type: 'subscription_growth',
          title: '订阅服务支出较高',
          description: `订阅服务支出¥${subscriptionSpending.toFixed(0)}，建议定期审查订阅服务`,
          impact: 'high',
          confidence: 90,
          recommendation: '审查所有订阅服务，优先取消使用频率低的服务，考虑年付折扣',
          icon: '📱'
        });
      }

      // 生成习惯评分
      const habitScore = calculateHabitScore(spendingAnalysis, patterns);

      // 生成月度趋势
      const monthlyTrends = analyzeMonthlyTrends(categoryData, filteredLastMonthData || []);

      setData({
        patterns,
        spendingAnalysis,
        habitScore,
        monthlyTrends
      });

    } catch (error) {
      console.error('分析消费模式失败:', error);
    }
  }, [aiData]);

  // 处理数据
  const processData = useCallback(() => {
    setLoading(true);
    analyzeSpendingPatterns();
    setLoading(false);
  }, [analyzeSpendingPatterns]);

  // 初始化加载
  useEffect(() => {
    if (aiData) {
      processData();
    }
  }, [aiData]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-600 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-600 border-green-200';
      default:
        return 'bg-gray-100 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return '📈';
      case 'decreasing':
        return '📉';
      default:
        return '➡️';
    }
  };

  if (!aiData) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent font-semibold">
              可变支出深度洞察
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Brain className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <div className="text-sm">等待数据加载...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent font-semibold">
              可变支出深度洞察
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                processData();
              }}
              disabled={loading}
              className="h-6 w-6 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </motion.div>
          </div>
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
              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Brain className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <div className="text-sm">分析中...</div>
                </div>
              ) : data ? (
                <>
                  {/* 习惯评分 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-100 dark:border-green-800">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">可变支出习惯评分</h4>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {data.habitScore.overall}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">综合评分</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">{data.habitScore.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-medium text-blue-600 dark:text-blue-400">{data.habitScore.predictability}</div>
                        <div className="text-gray-500 dark:text-gray-400">预测性</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-purple-600 dark:text-purple-400">{data.habitScore.diversity}</div>
                        <div className="text-gray-500 dark:text-gray-400">多样性</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-orange-600 dark:text-orange-400">{data.habitScore.regularity}</div>
                        <div className="text-gray-500 dark:text-gray-400">规律性</div>
                      </div>
                    </div>
                  </div>

                  {/* 洞察模式 */}
                  {data.patterns.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">可变支出洞察</h4>
                      {data.patterns.map((pattern) => (
                        <div
                          key={pattern.id}
                          className={`p-3 rounded-lg border ${getImpactColor(pattern.impact)}`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{pattern.icon}</span>
                              <div>
                                <div className="text-sm font-medium">{pattern.title}</div>
                                <div className="text-xs opacity-80">{pattern.description}</div>
                              </div>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-700 bg-opacity-50 dark:bg-opacity-50">
                              {Math.round(pattern.confidence)}%
                            </span>
                          </div>
                          <div className="text-xs mt-1 opacity-90">{pattern.recommendation}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 月度趋势 */}
                  {data.monthlyTrends.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">可变支出月度趋势</h4>
                      {data.monthlyTrends.map((trend, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <span>{getTrendIcon(trend.trend)}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{trend.category}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            trend.trend === 'increasing' ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300' :
                            trend.trend === 'decreasing' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                          }`}>
                            {trend.changeRate > 0 ? '+' : ''}{trend.changeRate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 改进建议 */}
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">改进建议</h4>
                    <ul className="space-y-1">
                      {data.habitScore.improvements.map((improvement, index) => (
                        <li key={index} className="text-xs text-blue-600 dark:text-blue-300 flex items-start gap-1">
                          <span>•</span>
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Brain className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <div className="text-sm">暂无足够数据进行分析</div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}