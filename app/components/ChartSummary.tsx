"use client";

import React from 'react';

type ChartSummaryProps = {
  trend: Array<{ name: string; expense: number }>;
  pieMonth: Array<{ name: string; value: number }>;
  pieRange: Array<{ name: string; value: number }>;
  currency: string;
};

export function ChartSummary({ trend, pieMonth, pieRange, currency }: ChartSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
      <div className="rounded-lg border bg-white p-4">
        <div className="text-xs uppercase text-gray-500">趋势点数</div>
        <div className="mt-2 text-2xl font-semibold text-gray-900">{trend.length}</div>
        <p className="mt-1 text-xs">系统暂未启用图表，展示当前数据的基础统计。</p>
      </div>
      <div className="rounded-lg border bg-white p-4">
        <div className="text-xs uppercase text-gray-500">月度分类数</div>
        <div className="mt-2 text-2xl font-semibold text-gray-900">{pieMonth.length}</div>
        <p className="mt-1 text-xs">{pieMonth.length > 0 ? '数据已加载，可用于后续可视化。' : '暂无可视化数据。'}</p>
      </div>
      <div className="rounded-lg border bg-white p-4">
        <div className="text-xs uppercase text-gray-500">当前区间分类数</div>
        <div className="mt-2 text-2xl font-semibold text-gray-900">{pieRange.length}</div>
        <p className="mt-1 text-xs">币种：{currency}</p>
      </div>
    </div>
  );
}
