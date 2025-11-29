'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ChevronDown, RefreshCw, Activity, Coffee, ShoppingCart, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAllDataSyncEvents } from '@/hooks/useEnhancedDataSync';

interface HabitPattern {
  period: string;
  frequency: number;
  averageAmount: number;
  totalAmount: number;
  icon: string;
  description: string;
}

interface WeeklyPattern {
  weekday: number;
  weekend: number;
  ratio: number;
  insight: string;
}

interface TimePattern {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
  peakTime: string;
  insight: string;
}

interface MerchantHabit {
  merchant: string;
  frequency: number;
  totalAmount: number;
  averageAmount: number;
  category: string;
  isHabitual: boolean;
}

interface ConsumptionHabitsData {
  monthlyPatterns: HabitPattern[];
  weeklyPattern: WeeklyPattern;
  timePattern: TimePattern;
  topMerchants: MerchantHabit[];
  habitScore: {
    overall: number;
    regularity: number;
    diversity: number;
    consistency: number;
  };
  insights: Array<{
    type: 'strength' | 'warning' | 'opportunity';
    title: string;
    description: string;
    suggestion: string;
    icon: string;
  }>;
}

interface ConsumptionHabitsPanelProps {
  className?: string;
  currentMonth?: string;
}

export function ConsumptionHabitsPanel({
  className = '',
  currentMonth = ''
}: ConsumptionHabitsPanelProps) {
  const [data, setData] = useState<ConsumptionHabitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // 监听数据同步事件
  useAllDataSyncEvents(() => {
    analyzeConsumptionHabits();
  });

  // 分析消费习惯
  const analyzeConsumptionHabits = async () => {
    try {
      const month = currentMonth || new Date().toISOString().slice(0, 7);

      // 获取最近3个月的数据用于习惯分析
      const currentDate = new Date();
      const months = [
        month,
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().slice(0, 7),
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1).toISOString().slice(0, 7)
      ];

      const monthlyData = await Promise.all(
        months.map(async (m) => {
          const startDate = `${m}-01`;
          const endDate = `${m}-31`;
          const response = await fetch(`/api/transactions?start_date=${startDate}&end_date=${endDate}&type=expense&page_size=1000`);
          const result = await response.json();
          return { month: m, data: result.data || [] };
        })
      );

      const currentMonthData = monthlyData.find(d => d.month === month)?.data || [];
      const lastMonthData = monthlyData.find(d => d.month !== month)?.data || [];

      // 分析月度模式
      const monthlyPatterns: HabitPattern[] = [];
      const categoryIcons: Record<string, string> = {
        food: '🍽️',
        transport: '🚇',
        drink: '☕',
        daily: '🛍️',
        subscription: '📱',
        entertainment: '🎮',
        shopping: '🛒',
        medical: '💊'
      };

      // 按分类分析消费模式
      const categoryStats = new Map<string, {
        count: number;
        total: number;
        transactions: any[];
      }>();

      currentMonthData.forEach(transaction => {
        const category = transaction.category;
        if (!categoryStats.has(category)) {
          categoryStats.set(category, { count: 0, total: 0, transactions: [] });
        }
        const stats = categoryStats.get(category)!;
        stats.count++;
        stats.total += transaction.amount;
        stats.transactions.push(transaction);
      });

      // 生成月度模式
      categoryStats.forEach((stats, category) => {
        if (stats.count >= 4) { // 至少出现4次才认为是模式
          monthlyPatterns.push({
            period: category,
            frequency: stats.count,
            averageAmount: Math.round(stats.total / stats.count),
            totalAmount: stats.total,
            icon: categoryIcons[category] || '💰',
            description: `${getFrequencyDescription(stats.count)}月度${getCategoryName(category)}消费`
          });
        }
      });

      // 分析周模式
      const weeklyPattern = analyzeWeeklyPattern(currentMonthData);

      // 分析时间模式
      const timePattern = analyzeTimePattern(currentMonthData);

      // 分析商家习惯
      const topMerchants = analyzeMerchantHabits(currentMonthData);

      // 计算习惯评分
      const habitScore = calculateHabitScore(monthlyPatterns, weeklyPattern, timePattern, topMerchants);

      // 生成洞察
      const insights = generateInsights(monthlyPatterns, weeklyPattern, timePattern, topMerchants, habitScore);

      setData({
        monthlyPatterns: monthlyPatterns.slice(0, 5),
        weeklyPattern,
        timePattern,
        topMerchants: topMerchants.slice(0, 5),
        habitScore,
        insights: insights.slice(0, 4)
      });

    } catch (error) {
      console.error('分析消费习惯失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 分析周模式
  const analyzeWeeklyPattern = (transactions: any[]): WeeklyPattern => {
    let weekday = 0, weekend = 0;

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekend += transaction.amount;
      } else {
        weekday += transaction.amount;
      }
    });

    const total = weekday + weekend;
    const ratio = total > 0 ? weekend / total : 0;

    let insight = '';
    if (ratio > 0.6) {
      insight = '周末消费倾向明显，建议适当控制周末支出';
    } else if (ratio < 0.3) {
      insight = '工作日消费为主，消费模式较为规律';
    } else {
      insight = '周末工作日消费相对均衡';
    }

    return { weekday, weekend, ratio, insight };
  };

  // 分析时间模式
  const analyzeTimePattern = (transactions: any[]): TimePattern => {
    let morning = 0, afternoon = 0, evening = 0, night = 0;

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const hour = date.getHours();

      if (hour >= 6 && hour < 12) {
        morning += transaction.amount;
      } else if (hour >= 12 && hour < 18) {
        afternoon += transaction.amount;
      } else if (hour >= 18 && hour < 22) {
        evening += transaction.amount;
      } else {
        night += transaction.amount;
      }
    });

    const timeSlots = [
      { period: '早晨', amount: morning, range: '6:00-12:00' },
      { period: '下午', amount: afternoon, range: '12:00-18:00' },
      { period: '晚上', amount: evening, range: '18:00-22:00' },
      { period: '深夜', amount: night, range: '22:00-6:00' }
    ];

    const peakSlot = timeSlots.reduce((max, current) =>
      current.amount > max.amount ? current : max
    );

    let insight = '';
    if (peakSlot.period === '深夜') {
      insight = '深夜消费较多，可能影响健康和财务';
    } else if (peakSlot.period === '早晨') {
      insight = '早晨消费活跃，可能是早餐或通勤支出';
    } else if (peakSlot.period === '晚上') {
      insight = '晚上消费较多，注意控制夜间支出';
    } else {
      insight = '下午消费为主，消费时间分布较为合理';
    }

    return {
      morning,
      afternoon,
      evening,
      night,
      peakTime: peakSlot.range,
      insight
    };
  };

  // 分析商家习惯
  const analyzeMerchantHabits = (transactions: any[]): MerchantHabit[] => {
    const merchantStats = new Map<string, {
      count: number;
      total: number;
      category: string;
      transactions: any[];
    }>();

    transactions.forEach(transaction => {
      const merchant = transaction.note || '未知商家';
      if (!merchantStats.has(merchant)) {
        merchantStats.set(merchant, { count: 0, total: 0, category: transaction.category, transactions: [] });
      }
      const stats = merchantStats.get(merchant)!;
      stats.count++;
      stats.total += transaction.amount;
      stats.transactions.push(transaction);
    });

    return Array.from(merchantStats.entries())
      .map(([merchant, stats]) => ({
        merchant,
        frequency: stats.count,
        totalAmount: stats.total,
        averageAmount: Math.round(stats.total / stats.count),
        category: stats.category,
        isHabitual: stats.count >= 3 // 至少3次认为是习惯性消费
      }))
      .sort((a, b) => b.frequency - a.frequency);
  };

  // 计算习惯评分
  const calculateHabitScore = (
    patterns: HabitPattern[],
    weekly: WeeklyPattern,
    time: TimePattern,
    merchants: MerchantHabit[]
  ) => {
    // 规律性评分
    const regularity = Math.min(100, patterns.length * 15 + merchants.filter(m => m.isHabitual).length * 10);

    // 多样性评分（适度的多样性是好的）
    const diversity = Math.min(100, patterns.length * 12);

    // 一致性评分（基于时间规律性）
    const timeConsistency = Math.max(0, 100 - Math.abs(0.4 - weekly.ratio) * 100);
    const consistency = (timeConsistency + (merchants.filter(m => m.isHabitual).length * 10)) / 2;

    const overall = Math.round((regularity + diversity + consistency) / 3);

    return {
      overall,
      regularity: Math.round(regularity),
      diversity: Math.round(diversity),
      consistency: Math.round(consistency)
    };
  };

  // 生成洞察
  const generateInsights = (
    patterns: HabitPattern[],
    weekly: WeeklyPattern,
    time: TimePattern,
    merchants: MerchantHabit[],
    score: any
  ) => {
    const insights = [];

    // 高频消费洞察
    if (merchants.length > 0 && merchants[0].frequency >= 8) {
      insights.push({
        type: 'warning' as const,
        title: '高频消费商家',
        description: `${merchants[0].merchant}月度消费${merchants[0].frequency}次`,
        suggestion: '考虑是否有更经济的替代选择',
        icon: '🏪'
      });
    }

    // 周末消费洞察
    if (weekly.ratio > 0.6) {
      insights.push({
        type: 'opportunity' as const,
        title: '周末消费倾向',
        description: `周末消费占比${(weekly.ratio * 100).toFixed(1)}%`,
        suggestion: '制定周末预算计划，控制冲动消费',
        icon: '🎉'
      });
    }

    // 时间模式洞察
    if (time.peakTime === '22:00-6:00' && time.night > 100) {
      insights.push({
        type: 'warning' as const,
        title: '深夜消费较多',
        description: `深夜消费¥${time.night}`,
        suggestion: '减少夜间消费，有助于健康和储蓄',
        icon: '🌙'
      });
    }

    // 习惯强度洞察
    if (score.overall >= 80) {
      insights.push({
        type: 'strength' as const,
        title: '消费习惯稳定',
        description: '消费模式具有较强的规律性和可预测性',
        suggestion: '保持良好的消费习惯，适时优化支出结构',
        icon: '⭐'
      });
    }

    return insights;
  };

  // 获取频率描述
  const getFrequencyDescription = (count: number): string => {
    if (count >= 15) return '高频';
    if (count >= 8) return '中频';
    if (count >= 4) return '低频';
    return '偶尔';
  };

  // 获取分类名称
  const getCategoryName = (category: string): string => {
    const names: Record<string, string> = {
      food: '餐饮',
      transport: '交通',
      drink: '饮品',
      daily: '日用品',
      subscription: '订阅',
      entertainment: '娱乐',
      shopping: '购物',
      medical: '医疗'
    };
    return names[category] || category;
  };

  // 刷新数据
  const refreshData = () => {
    setLoading(true);
    analyzeConsumptionHabits();
  };

  useEffect(() => {
    analyzeConsumptionHabits();
  }, [currentMonth]);

  // 获取时间图标
  const getTimeIcon = (timeSlot: string) => {
    switch (timeSlot) {
      case '早晨': return <Coffee className="h-4 w-4 text-amber-500" />;
      case '下午': return <Activity className="h-4 w-4 text-blue-500" />;
      case '晚上': return <Calendar className="h-4 w-4 text-purple-500" />;
      default: return <Clock className="h-4 w-4 text-indigo-500" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-600" />
            <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent font-semibold">
              消费习惯
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
                  {/* 习惯评分 */}
                  <div className="bg-white rounded-lg p-4 border border-teal-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">习惯稳定度</span>
                      <span className={`text-lg font-bold ${
                        data.habitScore.overall >= 80 ? 'text-green-600' :
                        data.habitScore.overall >= 60 ? 'text-blue-600' :
                        'text-orange-600'
                      }`}>
                        {data.habitScore.overall}分
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500 dark:text-gray-400">规律性</div>
                        <div className="font-semibold">{data.habitScore.regularity}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500 dark:text-gray-400">多样性</div>
                        <div className="font-semibold">{data.habitScore.diversity}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500 dark:text-gray-400">一致性</div>
                        <div className="font-semibold">{data.habitScore.consistency}</div>
                      </div>
                    </div>
                  </div>

                  {/* 月度模式 */}
                  {data.monthlyPatterns.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">月度消费模式</div>
                      {data.monthlyPatterns.map((pattern, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{pattern.icon}</span>
                            <div>
                              <div className="text-sm font-medium">{pattern.description}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{pattern.frequency}次 · 均价¥{pattern.averageAmount}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">¥{pattern.totalAmount}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 时间模式分析 */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">消费时间模式</div>
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">早晨</div>
                          <div className="text-sm font-semibold">¥{data.timePattern.morning}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">下午</div>
                          <div className="text-sm font-semibold">¥{data.timePattern.afternoon}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">晚上</div>
                          <div className="text-sm font-semibold">¥{data.timePattern.evening}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">深夜</div>
                          <div className="text-sm font-semibold">¥{data.timePattern.night}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <Clock className="h-3 w-3" />
                        <span>高峰时段: {data.timePattern.peakTime}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{data.timePattern.insight}</div>
                    </div>
                  </div>

                  {/* 习惯洞察 */}
                  {data.insights.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">习惯洞察</div>
                      {data.insights.map((insight, index) => (
                        <div key={index} className="p-3 bg-white rounded border border-gray-100">
                          <div className="flex items-start gap-3">
                            <span className="text-lg">{insight.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-800">{insight.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  insight.type === 'strength' ? 'bg-green-100 text-green-600' :
                                  insight.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  {insight.type === 'strength' ? '优势' :
                                   insight.type === 'warning' ? '注意' : '机会'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">{insight.description}</div>
                              <div className="text-xs text-teal-600">{insight.suggestion}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 刷新按钮 */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshData}
                      disabled={loading}
                      className="text-teal-600 hover:text-teal-700 border-teal-200 hover:bg-teal-50"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                      刷新分析
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm">习惯分析中...</div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}