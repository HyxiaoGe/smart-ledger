"use client";

import { useState, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/contexts/CategoryContext';
import { TrendingUp, BarChart3, ChevronDown, ChevronUp, Store } from 'lucide-react';
import type { ChartTooltipProps, ChartLegendProps, LegendPayloadItem } from '@/types/ui/chart';
import type { TransactionRow } from '@/types/domain/transaction';

interface CategoryStatisticsProps {
  transactions: TransactionRow[];
  currency: string;
}

export function CategoryStatistics({ transactions }: CategoryStatisticsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { getCategoryMeta } = useCategories();

  // 计算分类统计数据（按主分类聚合）
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { total: number; count: number; percentage: number }>();
    let totalAmount = 0;

    // 聚合数据
    for (const transaction of transactions) {
      if (transaction.type !== 'expense') continue;

      const category = transaction.category || 'other';
      const amount = Number(transaction.amount || 0);

      totalAmount += amount;
      const current = stats.get(category) || { total: 0, count: 0, percentage: 0 };
      stats.set(category, {
        total: current.total + amount,
        count: current.count + 1,
        percentage: 0 // 稍后计算
      });
    }

    // 计算百分比并排序
    const sortedStats = Array.from(stats.entries())
      .map(([category, data]) => ({
        category,
        ...data,
        percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    return { sortedStats, totalAmount };
  }, [transactions]);

  // 计算分类下的商家统计（用于展开显示）
  const merchantStatsByCategory = useMemo(() => {
    const statsByCategory = new Map<string, Map<string, { total: number; count: number; subcategories: Map<string, { total: number; count: number }> }>>();

    for (const transaction of transactions) {
      if (transaction.type !== 'expense') continue;

      const category = transaction.category || 'other';
      const merchant = transaction.merchant || '未分类商家';
      const subcategory = transaction.subcategory;
      const amount = Number(transaction.amount || 0);

      // 初始化分类统计
      if (!statsByCategory.has(category)) {
        statsByCategory.set(category, new Map());
      }
      const categoryMap = statsByCategory.get(category)!;

      // 初始化商家统计
      if (!categoryMap.has(merchant)) {
        categoryMap.set(merchant, { total: 0, count: 0, subcategories: new Map() });
      }
      const merchantData = categoryMap.get(merchant)!;
      merchantData.total += amount;
      merchantData.count += 1;

      // 统计子分类
      if (subcategory) {
        if (!merchantData.subcategories.has(subcategory)) {
          merchantData.subcategories.set(subcategory, { total: 0, count: 0 });
        }
        const subData = merchantData.subcategories.get(subcategory)!;
        subData.total += amount;
        subData.count += 1;
      }
    }

    // 对每个分类下的商家按金额排序
    const sortedStats = new Map<string, Array<{ merchant: string; total: number; count: number; subcategories: Array<{ name: string; total: number; count: number }> }>>();

    for (const [category, merchantMap] of statsByCategory.entries()) {
      const merchantArray = Array.from(merchantMap.entries())
        .map(([merchant, data]) => ({
          merchant,
          total: data.total,
          count: data.count,
          subcategories: Array.from(data.subcategories.entries())
            .map(([name, subData]) => ({ name, total: subData.total, count: subData.count }))
            .sort((a, b) => b.total - a.total)
        }))
        .sort((a, b) => b.total - a.total);

      sortedStats.set(category, merchantArray);
    }

    return sortedStats;
  }, [transactions]);

  // 切换分类展开状态
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // 获取分类信息
  const getCategoryInfo = useCallback((categoryKey: string) => {
    const meta = getCategoryMeta(categoryKey);
    return {
      label: meta.label,
      color: meta.color,
      icon: meta.icon
    };
  }, [getCategoryMeta]);

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 饼图数据
  const pieData = categoryStats.sortedStats.map(stat => {
    const info = getCategoryInfo(stat.category);
    return {
      name: info.label,
      value: stat.total,
      category: stat.category,
      color: info.color,
      percentage: stat.percentage
    };
  });

  // 自定义饼图tooltip
  const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;

    const data = payload[0]?.payload as { category: string; value: number; percentage: number; count: number } | undefined;
    if (!data) return null;
    const info = getCategoryInfo(data.category);

    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{info.icon}</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{info.label}</span>
        </div>
        <div className="text-sm space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-300">金额:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">¥{formatCurrency(data.value)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-300">占比:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{data.percentage.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-300">笔数:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{categoryStats.sortedStats.find(s => s.category === data.category)?.count || 0}笔</span>
          </div>
        </div>
      </div>
    );
  };

  // 自定义legend
  const CustomLegend = ({ payload }: ChartLegendProps) => {
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {payload?.map((entry: LegendPayloadItem, index: number) => {
          const entryPayload = entry.payload as { category?: string } | undefined;
          const info = getCategoryInfo(entryPayload?.category || '');
          return (
            <div key={index} className="flex items-center gap-1 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{info.icon}</span>
              <span>{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (categoryStats.sortedStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            分类统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            暂无支出数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            分类统计
            <Badge variant="outline" className="text-xs">
              总计 ¥{formatCurrency(categoryStats.totalAmount)}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* 折叠状态：只显示饼图 */}
        <div className={`${isExpanded ? '' : 'max-h-96 overflow-hidden'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 饼图 */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.percentage.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 分类排行榜 */}
            <div className={`${isExpanded ? '' : 'max-h-64 overflow-y-auto'}`}>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                分类排行榜
                {!isExpanded && categoryStats.sortedStats.length > 5 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    滚动查看更多 ↓
                  </span>
                )}
              </h4>
              <div className="space-y-3">
                {categoryStats.sortedStats.map((stat, index) => {
                  const info = getCategoryInfo(stat.category);
                  return (
                    <div key={stat.category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-900 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {index + 1}
                        </div>
                        <span className="text-lg">{info.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{info.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{stat.count}笔</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          ¥{formatCurrency(stat.total)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {stat.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 展开状态：显示商家分层统计 */}
          {isExpanded && (
            <div className="mt-6 pt-6 border-t dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Store className="h-4 w-4" />
                商家分层统计
                <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">点击分类查看商家明细</span>
              </h4>
              <div className="space-y-3">
                {categoryStats.sortedStats.map((stat) => {
                  const info = getCategoryInfo(stat.category);
                  const isExpanded = expandedCategories.has(stat.category);
                  const merchants = merchantStatsByCategory.get(stat.category) || [];

                  return (
                    <div key={stat.category} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* 分类汇总行 */}
                      <button
                        onClick={() => toggleCategory(stat.category)}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          )}
                          <span className="text-lg">{info.icon}</span>
                          <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-gray-100">{info.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {merchants.length > 0 ? `${merchants.length}个商家 · ` : ''}{stat.count}笔
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            ¥{formatCurrency(stat.total)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {stat.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </button>

                      {/* 商家明细（展开时显示） */}
                      {isExpanded && merchants.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
                          {merchants.map((merchantData, idx) => (
                            <div key={idx} className="p-3 pl-12">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Store className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    {merchantData.merchant}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {merchantData.count}笔
                                  </Badge>
                                </div>
                                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                  ¥{formatCurrency(merchantData.total)}
                                </div>
                              </div>

                              {/* 子分类明细 */}
                              {merchantData.subcategories.length > 0 && (
                                <div className="ml-5 space-y-1">
                                  {merchantData.subcategories.map((sub, subIdx) => (
                                    <div key={subIdx} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600" />
                                        <span>{sub.name}</span>
                                        <span className="text-gray-400 dark:text-gray-400">({sub.count}笔)</span>
                                      </div>
                                      <span>¥{formatCurrency(sub.total)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 无商家数据提示 */}
                      {isExpanded && merchants.length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900">
                          暂无商家数据
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}