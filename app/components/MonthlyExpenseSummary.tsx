"use client";

import { useState, useMemo } from 'react';
import { TrendingUp, Calendar, DollarSign, BarChart3, TrendingDown, Minus } from 'lucide-react';

interface MonthlyExpenseSummaryProps {
  items: { date: string; total: number; count: number }[];
  transactions?: { amount: number; date: string; note?: string }[];
  yesterdayTransactions?: { amount: number; date: string; note?: string }[];
  monthTotalAmount?: number;
  monthTotalCount?: number;
  currency: string;
  dateRange?: string;
  rangeType?: string;
}

export function MonthlyExpenseSummary({ items, transactions = [], yesterdayTransactions = [], monthTotalAmount = 0, monthTotalCount = 0, currency, dateRange, rangeType }: MonthlyExpenseSummaryProps) {
  const [monthlyBudget] = useState(5000); // 默认月预算，后续可以做成可配置

  const statistics = useMemo(() => {
    if (!items || items.length === 0) {
      // 即使当前查询范围没有数据，月度进度仍然要基于当月累计计算
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

    // 计算实际的天数，而不是有支出的天数
    let actualDays = items.length;
    if (items.length > 1) {
      const dates = items.map(item => new Date(item.date)).sort((a, b) => a.getTime() - b.getTime());
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      actualDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    const dailyAverage = totalAmount / actualDays;
    const avgTransactionAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    // 基于单笔交易计算最高/最低金额
    let maxTransactionAmount = 0;
    let minTransactionAmount = 0;
    let maxTransactionDate = '';
    let maxTransactionNote = '';

    if (transactions.length > 0) {
      const amounts = transactions.map(t => Number(t.amount || 0));
      maxTransactionAmount = Math.max(...amounts);
      minTransactionAmount = Math.min(...amounts);

      // 找出最大金额的交易
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

    // 趋势分析：仅在单日查询时计算
    let trend = null;
    if ((rangeType === 'today' || rangeType === 'yesterday') && yesterdayTransactions.length >= 0) {
      const yesterdayAmount = yesterdayTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const yesterdayCount = yesterdayTransactions.length;

      if (yesterdayAmount > 0 || totalAmount > 0) {
        const amountChange = totalAmount - yesterdayAmount;
        const amountChangePercent = yesterdayAmount > 0 ? (amountChange / yesterdayAmount) * 100 : (totalAmount > 0 ? 100 : 0);
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

    // 月度进度基于当月累计数据，而不是当前查询范围的数据
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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!items || items.length === 0) {
    return (
      <div className="space-y-6">
        {/* 如果当前查询范围没有数据，显示提示 */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center">
          <div className="text-gray-500 text-lg">📊</div>
          <div className="text-gray-600 mt-2">当前时间范围暂无支出记录</div>
        </div>

        {/* 月度进度条 - 即使没有当前范围数据也要显示 */}
        <div className="space-y-4">
          {/* 月天数进度条 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 shadow-lg border border-green-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:from-green-100 hover:to-emerald-100 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-gray-800">本月时间进度</h4>
              </div>
              <span className="text-sm text-gray-600">
                第 {new Date().getDate()} 天 / {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} 天
              </span>
            </div>

            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">月初</span>
                <span className="text-xs font-semibold text-green-600">
                  {((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">月末</span>
              </div>
            </div>
          </div>

          {/* 月度预算进度条 */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 shadow-lg border border-purple-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:from-purple-100 hover:to-pink-100 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-gray-800">月度预算进度</h4>
                <div className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded">
                  本月累计
                </div>
              </div>
              <span className="text-sm text-gray-600">
                ¥{formatCurrency(statistics.monthTotalAmount)} / ¥{formatCurrency(monthlyBudget)}
              </span>
            </div>

            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${statistics.monthProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">0%</span>
                <span className="text-xs font-semibold text-purple-600">
                  {statistics.monthProgress.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">100%</span>
              </div>
            </div>
          </div>
        </div>
        </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate().toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 总览卡片 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 shadow-lg border border-blue-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:from-blue-100 hover:to-indigo-150 cursor-pointer">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-800">支出统计</h3>
          </div>
          {dateRange && (
            <span className="text-sm text-gray-600 bg-white/50 px-3 py-1 rounded-full">
              {dateRange}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* 趋势分析 - 仅在单日查询时显示 */}
          {statistics.trend && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 shadow-lg border border-amber-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:from-amber-100 hover:to-orange-100 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold text-gray-800">较昨日变化</h4>
                </div>
                <span className="text-sm text-gray-600">
                  昨日: ¥{formatCurrency(statistics.trend.yesterdayAmount)} ({statistics.trend.yesterdayCount}笔)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                {/* 金额变化 */}
                <div className="flex items-center justify-between bg-white/60 rounded-lg p-3 transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:scale-105 cursor-pointer group">
                  <span className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-200">支出金额</span>
                  <div className="flex items-center gap-2">
                    {statistics.trend.amountChangePercent > 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-red-500 group-hover:scale-110 group-hover:text-red-600 transition-all duration-200" />
                        <span className="font-semibold text-red-600 group-hover:text-red-700 transition-colors duration-200">
                          +{formatCurrency(statistics.trend.amountChange)} (+{statistics.trend.amountChangePercent.toFixed(1)}%)
                        </span>
                      </>
                    ) : statistics.trend.amountChangePercent < 0 ? (
                      <>
                        <TrendingDown className="h-4 w-4 text-green-500 group-hover:scale-110 group-hover:text-green-600 transition-all duration-200" />
                        <span className="font-semibold text-green-600 group-hover:text-green-700 transition-colors duration-200">
                          {formatCurrency(statistics.trend.amountChange)} ({statistics.trend.amountChangePercent.toFixed(1)}%)
                        </span>
                      </>
                    ) : (
                      <>
                        <Minus className="h-4 w-4 text-gray-400 group-hover:scale-110 group-hover:text-gray-500 transition-all duration-200" />
                        <span className="font-semibold text-gray-600 group-hover:text-gray-700 transition-colors duration-200">
                          无变化 (0%)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 笔数变化 */}
                <div className="flex items-center justify-between bg-white/60 rounded-lg p-3 transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:scale-105 cursor-pointer group">
                  <span className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-200">交易笔数</span>
                  <div className="flex items-center gap-2">
                    {statistics.trend.countChange > 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-blue-500 group-hover:scale-110 group-hover:text-blue-600 transition-all duration-200" />
                        <span className="font-semibold text-blue-600 group-hover:text-blue-700 transition-colors duration-200">
                          +{statistics.trend.countChange}笔
                        </span>
                      </>
                    ) : statistics.trend.countChange < 0 ? (
                      <>
                        <TrendingDown className="h-4 w-4 text-gray-500 group-hover:scale-110 group-hover:text-gray-600 transition-all duration-200" />
                        <span className="font-semibold text-gray-600 group-hover:text-gray-700 transition-colors duration-200">
                          {statistics.trend.countChange}笔
                        </span>
                      </>
                    ) : (
                      <>
                        <Minus className="h-4 w-4 text-gray-400 group-hover:scale-110 group-hover:text-gray-500 transition-all duration-200" />
                        <span className="font-semibold text-gray-600 group-hover:text-gray-700 transition-colors duration-200">
                          无变化
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 第一行：核心统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/60 rounded-lg p-4 text-center transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="flex items-center justify-center gap-2 text-red-600 mb-1 group-hover:text-red-700 transition-colors duration-200">
                <DollarSign className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">总支出</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors duration-200">
                ¥{formatCurrency(statistics.totalAmount)}
              </div>
            </div>

            <div className="bg-white/60 rounded-lg p-4 text-center transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-1 group-hover:text-blue-700 transition-colors duration-200">
                <Calendar className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">总笔数</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors duration-200">
                {statistics.totalCount}笔
              </div>
            </div>

            <div className="bg-white/60 rounded-lg p-4 text-center transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="flex items-center justify-center gap-2 text-green-600 mb-1 group-hover:text-green-700 transition-colors duration-200">
                <TrendingUp className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">日均支出</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors duration-200">
                ¥{formatCurrency(statistics.dailyAverage)}
              </div>
            </div>
          </div>

          {/* 第二行：详细分析 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/40 rounded-lg p-3 text-center transition-all duration-200 hover:bg-white/60 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="text-xs text-gray-600 mb-1 group-hover:text-gray-700 transition-colors duration-200">单笔最高</div>
              <div className="text-lg font-bold text-orange-600 group-hover:text-orange-700 group-hover:scale-110 transition-all duration-200">
                ¥{formatCurrency(statistics.maxTransactionAmount)}
              </div>
            </div>

            <div className="bg-white/40 rounded-lg p-3 text-center transition-all duration-200 hover:bg-white/60 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="text-xs text-gray-600 mb-1 group-hover:text-gray-700 transition-colors duration-200">单笔最低</div>
              <div className="text-lg font-bold text-teal-600 group-hover:text-teal-700 group-hover:scale-110 transition-all duration-200">
                ¥{formatCurrency(statistics.minTransactionAmount)}
              </div>
            </div>

            <div className="bg-white/40 rounded-lg p-3 text-center transition-all duration-200 hover:bg-white/60 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="text-xs text-gray-600 mb-1 group-hover:text-gray-700 transition-colors duration-200">平均单笔</div>
              <div className="text-lg font-bold text-indigo-600 group-hover:text-indigo-700 group-hover:scale-110 transition-all duration-200">
                ¥{formatCurrency(statistics.avgTransactionAmount)}
              </div>
            </div>

            <div className="bg-white/40 rounded-lg p-3 text-center transition-all duration-200 hover:bg-white/60 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="text-xs text-gray-600 mb-1 group-hover:text-gray-700 transition-colors duration-200">消费强度</div>
              <div className="text-lg font-bold text-purple-600 group-hover:text-purple-700 group-hover:scale-110 transition-all duration-200">
                {statistics.totalCount > 0 ? (statistics.totalCount / items.length).toFixed(1) : '0'}笔/日
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 月度进度条 */}
      <div className="space-y-4">
        {/* 月天数进度条 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 shadow-lg border border-green-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:from-green-100 hover:to-emerald-100 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-gray-800">本月时间进度</h4>
            </div>
            <span className="text-sm text-gray-600">
              第 {new Date().getDate()} 天 / {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} 天
            </span>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden group-hover:h-4 transition-all duration-200">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500 ease-out group-hover:from-green-600 group-hover:to-emerald-600 group-hover:shadow-inner"
                style={{ width: `${(new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">月初</span>
              <span className="text-xs font-semibold text-green-600">
                {((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500">月末</span>
            </div>
          </div>
        </div>

        {/* 月度预算进度条 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 shadow-lg border border-purple-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:from-purple-100 hover:to-pink-100 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-gray-800">月度预算进度</h4>
              <div className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded">
                本月累计
              </div>
            </div>
            <span className="text-sm text-gray-600">
              ¥{formatCurrency(statistics.monthTotalAmount)} / ¥{formatCurrency(monthlyBudget)}
            </span>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${statistics.monthProgress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">0%</span>
              <span className="text-xs font-semibold text-purple-600">
                {statistics.monthProgress.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500">100%</span>
            </div>
          </div>
        </div>
      </div>
      </div>
  );
}

