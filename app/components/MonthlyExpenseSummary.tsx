"use client";

import { useMemo } from 'react';
import { TrendingUp, Calendar, DollarSign, BarChart3, TrendingDown, Minus } from 'lucide-react';
import { calculateMonthlyExpenseSummaryStats } from '@/lib/utils/recordStatistics';

export interface MonthlyExpenseSummaryProps {
  items: { date: string; total: number; count: number }[];
  transactions?: { amount: number; date: string; note?: string }[];
  yesterdayTransactions?: { amount: number; date: string; note?: string }[];
  monthTotalAmount?: number;
  monthTotalCount?: number;
  monthlyBudget?: number; // 月度预算，从预算设置中获取
  currency: string;
  dateRange?: string;
  rangeType?: string;
}

export function MonthlyExpenseSummary({ items, transactions = [], yesterdayTransactions = [], monthTotalAmount = 0, monthTotalCount = 0, monthlyBudget = 5000, dateRange, rangeType }: MonthlyExpenseSummaryProps) {
  const statistics = useMemo(() => {
    return calculateMonthlyExpenseSummaryStats({
      items,
      transactions,
      yesterdayTransactions,
      monthTotalAmount,
      monthTotalCount,
      monthlyBudget,
      rangeType,
    });
  }, [items, transactions, yesterdayTransactions, rangeType, monthTotalAmount, monthTotalCount, monthlyBudget]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!items || items.length === 0) {
    return (
      <div className="space-y-6">
        {/* 如果当前查询范围没有数据，显示提示 */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400 text-lg">📊</div>
          <div className="text-gray-600 dark:text-gray-300 mt-2">当前时间范围暂无支出记录</div>
        </div>

        {/* 月度进度条 - 即使没有当前范围数据也要显示 */}
        <div className="space-y-4">
          {/* 月天数进度条 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl p-6 shadow-lg border border-green-100 dark:border-green-800 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:from-green-100 hover:to-emerald-100 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">本月时间进度</h4>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                第 {new Date().getDate()} 天 / {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} 天
              </span>
            </div>

            <div className="relative">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">月初</span>
                <span className="text-xs font-semibold text-green-600">
                  {((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">月末</span>
              </div>
            </div>
          </div>

          {/* 月度预算进度条 */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl p-6 shadow-lg border border-purple-100 dark:border-purple-800 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:from-purple-100 hover:to-pink-100 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">月度预算进度</h4>
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 px-2 py-1 rounded">
                  本月累计
                </div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                ¥{formatCurrency(statistics.monthTotalAmount)} / ¥{formatCurrency(monthlyBudget)}
              </span>
            </div>

            <div className="relative">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${statistics.monthProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">0%</span>
                <span className="text-xs font-semibold text-purple-600">
                  {statistics.monthProgress.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">100%</span>
              </div>
            </div>
          </div>
        </div>
        </div>
    );
  }

  
  return (
    <div className="space-y-6">
      {/* 总览卡片 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-6 shadow-lg border border-blue-100 dark:border-blue-800 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:from-blue-100 hover:to-indigo-150 cursor-pointer">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">支出统计</h3>
          </div>
          {dateRange && (
            <span className="text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 px-3 py-1 rounded-full">
              {dateRange}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* 趋势分析 - 仅在单日查询时显示 */}
          {statistics.trend && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-xl p-4 shadow-lg border border-amber-100 dark:border-amber-800 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:from-amber-100 hover:to-orange-100 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">较昨日变化</h4>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  昨日: ¥{formatCurrency(statistics.trend.yesterdayAmount)} ({statistics.trend.yesterdayCount}笔)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                {/* 金额变化 */}
                <div className="flex items-center justify-between bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 transition-all duration-200 hover:bg-white/80 dark:bg-gray-800/80 hover:shadow-md hover:scale-105 cursor-pointer group">
                  <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-200">支出金额</span>
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
                        <Minus className="h-4 w-4 text-gray-400 dark:text-gray-400 group-hover:scale-110 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-all duration-200" />
                        <span className="font-semibold text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-200">
                          无变化 (0%)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 笔数变化 */}
                <div className="flex items-center justify-between bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 transition-all duration-200 hover:bg-white/80 dark:bg-gray-800/80 hover:shadow-md hover:scale-105 cursor-pointer group">
                  <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-200">交易笔数</span>
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
                        <TrendingDown className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:scale-110 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-all duration-200" />
                        <span className="font-semibold text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-200">
                          {statistics.trend.countChange}笔
                        </span>
                      </>
                    ) : (
                      <>
                        <Minus className="h-4 w-4 text-gray-400 dark:text-gray-400 group-hover:scale-110 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-all duration-200" />
                        <span className="font-semibold text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-200">
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
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4 text-center transition-all duration-200 hover:bg-white/80 dark:bg-gray-800/80 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="flex items-center justify-center gap-2 text-red-600 mb-1 group-hover:text-red-700 transition-colors duration-200">
                <DollarSign className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">总支出</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-gray-50 transition-colors duration-200">
                ¥{formatCurrency(statistics.totalAmount)}
              </div>
            </div>

            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4 text-center transition-all duration-200 hover:bg-white/80 dark:bg-gray-800/80 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-1 group-hover:text-blue-700 transition-colors duration-200">
                <Calendar className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">总笔数</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-gray-50 transition-colors duration-200">
                {statistics.totalCount}笔
              </div>
            </div>

            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4 text-center transition-all duration-200 hover:bg-white/80 dark:bg-gray-800/80 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="flex items-center justify-center gap-2 text-green-600 mb-1 group-hover:text-green-700 transition-colors duration-200">
                <TrendingUp className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-medium">日均支出</span>
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-gray-50 transition-colors duration-200">
                ¥{formatCurrency(statistics.dailyAverage)}
              </div>
            </div>
          </div>

          {/* 第二行：详细分析 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/40 dark:bg-gray-800/40 rounded-lg p-3 text-center transition-all duration-200 hover:bg-white/60 dark:bg-gray-800/60 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200">单笔最高</div>
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 group-hover:scale-110 transition-all duration-200">
                ¥{formatCurrency(statistics.maxTransactionAmount)}
              </div>
            </div>

            <div className="bg-white/40 dark:bg-gray-800/40 rounded-lg p-3 text-center transition-all duration-200 hover:bg-white/60 dark:bg-gray-800/60 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200">单笔最低</div>
              <div className="text-lg font-bold text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 group-hover:scale-110 transition-all duration-200">
                ¥{formatCurrency(statistics.minTransactionAmount)}
              </div>
            </div>

            <div className="bg-white/40 dark:bg-gray-800/40 rounded-lg p-3 text-center transition-all duration-200 hover:bg-white/60 dark:bg-gray-800/60 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200">平均单笔</div>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 group-hover:scale-110 transition-all duration-200">
                ¥{formatCurrency(statistics.avgTransactionAmount)}
              </div>
            </div>

            <div className="bg-white/40 dark:bg-gray-800/40 rounded-lg p-3 text-center transition-all duration-200 hover:bg-white/60 dark:bg-gray-800/60 hover:shadow-md hover:scale-105 cursor-pointer group">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200">消费强度</div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 group-hover:scale-110 transition-all duration-200">
                {statistics.intensityPerDay.toFixed(1)}笔/日
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 月度进度条 */}
      <div className="space-y-4">
        {/* 月天数进度条 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl p-6 shadow-lg border border-green-100 dark:border-green-800 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:from-green-100 hover:to-emerald-100 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">本月时间进度</h4>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              第 {new Date().getDate()} 天 / {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} 天
            </span>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden group-hover:h-4 transition-all duration-200">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500 ease-out group-hover:from-green-600 group-hover:to-emerald-600 group-hover:shadow-inner"
                style={{ width: `${(new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">月初</span>
              <span className="text-xs font-semibold text-green-600">
                {((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">月末</span>
            </div>
          </div>
        </div>

        {/* 月度预算进度条 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl p-6 shadow-lg border border-purple-100 dark:border-purple-800 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:from-purple-100 hover:to-pink-100 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">月度预算进度</h4>
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 px-2 py-1 rounded">
                本月累计
              </div>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              ¥{formatCurrency(statistics.monthTotalAmount)} / ¥{formatCurrency(monthlyBudget)}
            </span>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${statistics.monthProgress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">0%</span>
              <span className="text-xs font-semibold text-purple-600">
                {statistics.monthProgress.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">100%</span>
            </div>
          </div>
        </div>
      </div>
      </div>
  );
}
