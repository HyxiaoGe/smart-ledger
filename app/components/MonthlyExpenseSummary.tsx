"use client";

import React, { useMemo, useState } from 'react';
import { TrendingUp, Calendar, DollarSign, BarChart3, TrendingDown, Minus } from 'lucide-react';

interface MonthlyExpenseSummaryProps {
  items: { date: string; total: number; count: number }[];
  transactions?: { amount: number; date: string; note?: string }[];
  yesterdayTransactions?: { amount: number; date: string; note?: string }[];
  monthTotalAmount?: number;
  monthTotalCount?: number;
  dateRange?: string;
  rangeType?: string;
}

export function MonthlyExpenseSummary({
  items,
  transactions = [],
  yesterdayTransactions = [],
  monthTotalAmount = 0,
  monthTotalCount = 0,
  dateRange,
  rangeType
}: MonthlyExpenseSummaryProps) {
  const [monthlyBudget] = useState(5000);

  const statistics = useMemo(() => {
    if (!items || items.length === 0) {
      const monthProgress = (monthTotalAmount / monthlyBudget) * 100;

      return {
        totalAmount: 0,
        totalCount: 0,
        dailyAverage: 0,
        maxTransactionAmount: 0,
        minTransactionAmount: 0,
        avgTransactionAmount: 0,
        maxTransactionDate: '',
        maxTransactionNote: '',
        monthTotalAmount,
        monthTotalCount,
        monthProgress: Math.min(monthProgress, 100),
        trend: null
      };
    }

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    const totalCount = items.reduce((sum, item) => sum + item.count, 0);

    let actualDays = items.length;
    if (items.length > 1) {
      const dates = items.map((item) => new Date(item.date)).sort((a, b) => a.getTime() - b.getTime());
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      actualDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    const dailyAverage = totalAmount / actualDays;
    const avgTransactionAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    let maxTransactionAmount = 0;
    let minTransactionAmount = 0;
    let maxTransactionDate = '';
    let maxTransactionNote = '';

    if (transactions.length > 0) {
      const amounts = transactions.map((t) => Number(t.amount || 0));
      maxTransactionAmount = Math.max(...amounts);
      minTransactionAmount = Math.min(...amounts);

      const maxTransaction = transactions.reduce((max, t) => {
        const amount = Number(t.amount || 0);
        return amount > Number(max.amount || 0) ? t : max;
      }, transactions[0]);

      if (maxTransaction) {
        maxTransactionAmount = Number(maxTransaction.amount || 0);
        maxTransactionDate = maxTransaction.date || '';
        maxTransactionNote = maxTransaction.note || '';
      }
    }

    let trend: {
      amountChange: number;
      amountChangePercent: number;
      countChange: number;
      yesterdayAmount: number;
      yesterdayCount: number;
    } | null = null;

    if ((rangeType === 'today' || rangeType === 'yesterday') && yesterdayTransactions.length >= 0) {
      const yesterdayAmount = yesterdayTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const yesterdayCount = yesterdayTransactions.length;

      if (yesterdayAmount > 0 || totalAmount > 0) {
        const amountChange = totalAmount - yesterdayAmount;
        const amountChangePercent =
          yesterdayAmount > 0 ? (amountChange / yesterdayAmount) * 100 : totalAmount > 0 ? 100 : 0;
        const countChange = totalCount - yesterdayCount;

        trend = {
          amountChange,
          amountChangePercent,
          countChange,
          yesterdayAmount,
          yesterdayCount
        };
      }
    }

    const monthProgress = (monthTotalAmount / monthlyBudget) * 100;

    return {
      totalAmount,
      totalCount,
      dailyAverage,
      maxTransactionAmount,
      minTransactionAmount,
      avgTransactionAmount,
      maxTransactionDate,
      maxTransactionNote,
      monthTotalAmount,
      monthTotalCount,
      monthProgress: Math.min(monthProgress, 100),
      trend
    };
  }, [items, transactions, yesterdayTransactions, rangeType, monthTotalAmount, monthTotalCount, monthlyBudget]);

  const formatCurrency = (value: number) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!items || items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center">
          <div className="text-lg font-semibold text-gray-800 mb-1">暂无支出数据</div>
          <div className="text-sm text-gray-600">记录第一笔支出后即可看到统计</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-xs uppercase text-gray-500">本期支出</div>
                <div className="text-2xl font-semibold text-gray-900">￥0.00</div>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-6">
              记账后这里会实时展示本期支出概况，帮助你掌握资金流向。
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-xs uppercase text-gray-500">月度预算进度</div>
                <div className="text-2xl font-semibold text-gray-900">0%</div>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-6">
              设置月度预算后，会自动计算预算消耗进度，提醒你合理安排支出。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl p-6 shadow-lg border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-indigo-600 uppercase">本期支出</div>
              <div className="mt-1 text-2xl font-semibold text-indigo-900">
                ￥{formatCurrency(statistics.totalAmount)}
              </div>
            </div>
            <DollarSign className="h-10 w-10 text-indigo-500" />
          </div>
          <div className="space-y-2 text-sm text-indigo-700">
            <p>凭据：{items.length} 天共 {statistics.totalCount} 笔支出</p>
            <p>平均每日：￥{formatCurrency(statistics.dailyAverage)}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-6 shadow-lg border border-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-emerald-600 uppercase">月度累计</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-900">
                ￥{formatCurrency(statistics.monthTotalAmount)}
              </div>
            </div>
            <Calendar className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="space-y-2 text-sm text-emerald-700">
            <p>事项：{monthTotalCount} 笔支出已记录</p>
            <p>预算进度：{statistics.monthProgress.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <h4 className="font-semibold text-gray-800">单笔最高</h4>
          </div>
          <div className="text-2xl font-bold text-blue-600">￥{formatCurrency(statistics.maxTransactionAmount)}</div>
          <p className="text-xs text-gray-500 mt-1">{statistics.maxTransactionDate || '暂无记录'}</p>
          {statistics.maxTransactionNote ? (
            <p className="text-xs text-gray-500 mt-1">备注：{statistics.maxTransactionNote}</p>
          ) : null}
        </div>

        <div className="bg-white/80 backdrop-blur rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Minus className="h-5 w-5 text-teal-500" />
            <h4 className="font-semibold text-gray-800">单笔最低</h4>
          </div>
          <div className="text-2xl font-bold text-teal-600">￥{formatCurrency(statistics.minTransactionAmount)}</div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <TrendingDown className="h-5 w-5 text-purple-500" />
            <h4 className="font-semibold text-gray-800">平均单笔</h4>
          </div>
          <div className="text-2xl font-bold text-purple-600">￥{formatCurrency(statistics.avgTransactionAmount)}</div>
        </div>
      </div>

      {statistics.trend ? (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h4 className="font-semibold text-gray-800">与昨日比较</h4>
          </div>
          <p className="text-sm text-orange-700 leading-6">
            今日支出变化 {statistics.trend.amountChange.toFixed(2)}（{statistics.trend.amountChangePercent.toFixed(1)}%），
            支出笔数变化 {statistics.trend.countChange} 笔。
          </p>
        </div>
      ) : null}

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 shadow-lg border border-purple-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold text-gray-800">月度预算进度</h4>
          </div>
          <span className="text-sm text-gray-600">
            ￥{formatCurrency(statistics.monthTotalAmount)} / ￥{formatCurrency(monthlyBudget)}
          </span>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${statistics.monthProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0%</span>
            <span className="text-purple-600 font-semibold">{statistics.monthProgress.toFixed(1)}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {dateRange ? (
        <p className="text-xs text-muted-foreground">
          数据范围：{dateRange}
        </p>
      ) : null}
    </div>
  );
}
