"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PRESET_CATEGORIES } from '@/lib/config';

type Transaction = {
  type: string;
  category: string;
  amount: number;
};

type CategoryStat = {
  category: string;
  total: number;
  count: number;
};

type CategoryStatisticsProps = {
  transactions: Transaction[];
  currency: string;
};

function getCategoryInfo(key: string) {
  const matched = PRESET_CATEGORIES.find((item) => item.key === key);
  return {
    label: matched?.label || key,
    icon: matched?.icon || '??'
  };
}

export function CategoryStatistics({ transactions }: CategoryStatisticsProps) {
  const [visibleCount, setVisibleCount] = useState(5);

  const stats = useMemo<CategoryStat[]>(() => {
    const map = new Map<string, CategoryStat>();
    transactions.forEach((transaction) => {
      if (transaction.type !== 'expense') return;
      const key = transaction.category || 'other';
      const current = map.get(key) || { category: key, total: 0, count: 0 };
      current.total += Number(transaction.amount || 0);
      current.count += 1;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const visibleStats = stats.slice(0, visibleCount);

  if (stats.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          暂无分类统计数据
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>分类统计</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleStats.map((stat) => {
          const info = getCategoryInfo(stat.category);
          return (
            <div key={stat.category} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{info.icon}</span>
                <div>
                  <div className="font-medium text-foreground">{info.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.count} 笔</div>
                </div>
              </div>
              <Badge variant="outline">￥{stat.total.toFixed(2)}</Badge>
            </div>
          );
        })}
        {stats.length > visibleCount ? (
          <button
            type="button"
            className="text-xs text-blue-600 underline"
            onClick={() => setVisibleCount((prev) => Math.min(stats.length, prev + 5))}
          >
            查看更多
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
