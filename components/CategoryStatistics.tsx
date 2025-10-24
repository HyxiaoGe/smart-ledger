"use client";

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PRESET_CATEGORIES } from '@/lib/config';
import { TrendingUp, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

interface CategoryStatisticsProps {
  transactions: any[];
  currency: string;
}

export function CategoryStatistics({ transactions, currency }: CategoryStatisticsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 计算分类统计数据
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

  // 获取分类信息
  const getCategoryInfo = (categoryKey: string) => {
    const category = PRESET_CATEGORIES.find(c => c.key === categoryKey);
    return {
      label: category?.label || categoryKey,
      color: category?.color || '#6B7280',
      icon: category?.icon || '📁'
    };
  };

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
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    const info = getCategoryInfo(data.category);

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{info.icon}</span>
          <span className="font-medium">{info.label}</span>
        </div>
        <div className="text-sm space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">金额:</span>
            <span className="font-medium">¥{formatCurrency(data.value)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">占比:</span>
            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">笔数:</span>
            <span className="font-medium">{categoryStats.sortedStats.find(s => s.category === data.category)?.count || 0}笔</span>
          </div>
        </div>
      </div>
    );
  };

  // 自定义legend
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {payload.map((entry: any, index: number) => {
          const info = getCategoryInfo(entry.payload.category);
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
          <div className="text-center py-8 text-gray-500">
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
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                分类排行榜
                {!isExpanded && categoryStats.sortedStats.length > 5 && (
                  <span className="text-xs text-gray-500 ml-2">
                    滚动查看更多 ↓
                  </span>
                )}
              </h4>
              <div className="space-y-3">
                {categoryStats.sortedStats.map((stat, index) => {
                  const info = getCategoryInfo(stat.category);
                  return (
                    <div key={stat.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-sm font-semibold">
                          {index + 1}
                        </div>
                        <span className="text-lg">{info.icon}</span>
                        <div>
                          <div className="font-medium">{info.label}</div>
                          <div className="text-xs text-gray-500">{stat.count}笔</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ¥{formatCurrency(stat.total)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {stat.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 展开状态：显示详细统计 */}
          {isExpanded && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-4">详细统计</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryStats.sortedStats.map((stat) => {
                  const info = getCategoryInfo(stat.category);
                  return (
                    <div key={stat.category} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{info.icon}</span>
                          <span className="font-medium">{info.label}</span>
                        </div>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">支出:</span>
                          <span className="font-medium">¥{formatCurrency(stat.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">占比:</span>
                          <span className="font-medium">{stat.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">笔数:</span>
                          <span className="font-medium">{stat.count}笔</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">平均:</span>
                          <span className="font-medium">
                            ¥{formatCurrency(stat.count > 0 ? stat.total / stat.count : 0)}
                          </span>
                        </div>
                      </div>
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