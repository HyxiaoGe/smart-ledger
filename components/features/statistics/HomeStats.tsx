/* eslint-disable */
'use client';

import React, { useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/helpers';
import { SUPPORTED_CURRENCIES } from '@/lib/config/config';
import { TrendingUp, TrendingDown, Minus, Receipt, Calendar } from 'lucide-react';

interface HomeStatsProps {
  rangeExpense: number;
  rangeCount: number;
  rangeDailyAvg: number;
  rangeLabel: string;
  prevRangeExpense: number;
  prevRangeLabel: string;
  currency: string;
  isSingleDay?: boolean;
  isToday?: boolean;
}

function symbolOf(code: string) {
  const found = SUPPORTED_CURRENCIES.find((item) => item.code === code);
  return found?.symbol ?? '';
}

function calculateChangePercent(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

export function HomeStats({
  rangeExpense,
  rangeCount,
  rangeDailyAvg,
  rangeLabel,
  prevRangeExpense,
  prevRangeLabel,
  currency,
  isSingleDay = false,
  isToday = false,
}: HomeStatsProps) {
  const sym = symbolOf(currency);
  const changePercent = calculateChangePercent(rangeExpense, prevRangeExpense);
  const showDailyAvgCard = !isSingleDay;
  const showComparisonCard = isSingleDay && isToday;
  const showThirdCard = showDailyAvgCard || showComparisonCard;
  const delta = rangeExpense - prevRangeExpense;
  const deltaText =
    delta > 0
      ? `+${sym}${Math.abs(delta).toFixed(2)}`
      : delta < 0
        ? `-${sym}${Math.abs(delta).toFixed(2)}`
        : `${sym}0.00`;

  const [expenseSpring, expenseApi] = useSpring(() => ({
    value: rangeExpense,
    config: { tension: 180, friction: 24 },
  }));

  const [countSpring, countApi] = useSpring(() => ({
    value: rangeCount,
    config: { tension: 180, friction: 24 },
  }));

  const [avgSpring, avgApi] = useSpring(() => ({
    value: rangeDailyAvg,
    config: { tension: 180, friction: 24 },
  }));

  useEffect(() => {
    expenseApi.start({ value: rangeExpense });
  }, [rangeExpense, expenseApi]);

  useEffect(() => {
    countApi.start({ value: rangeCount });
  }, [rangeCount, countApi]);

  useEffect(() => {
    avgApi.start({ value: rangeDailyAvg });
  }, [rangeDailyAvg, avgApi]);

  // 环比变化指示器
  const TrendIndicator = () => {
    if (Math.abs(changePercent) < 0.1) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Minus className="w-3 h-3" />
          持平
        </span>
      );
    }
    if (changePercent > 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <TrendingUp className="w-3 h-3" />
          +{changePercent.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-green-500">
        <TrendingDown className="w-3 h-3" />
        {changePercent.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className={cn('grid grid-cols-1 gap-4', showThirdCard ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
      {/* 支出总额卡片 */}
      <Card className="relative overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{rangeLabel}支出</span>
            <TrendIndicator />
          </div>
          <animated.span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
            {expenseSpring.value.to((v) => `${sym}${v.toFixed(2)}`)}
          </animated.span>
          <p className="mt-2 text-xs text-muted-foreground">
            较{prevRangeLabel}: {sym}{prevRangeExpense.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* 交易笔数卡片 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">交易笔数</span>
          </div>
          <animated.span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
            {countSpring.value.to((v) => `${Math.round(v)} 笔`)}
          </animated.span>
          <p className="mt-2 text-xs text-muted-foreground">
            {rangeLabel}的支出记录
          </p>
        </CardContent>
      </Card>

      {/* 日均支出/较昨日卡片 */}
      {showDailyAvgCard && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">日均支出</span>
            </div>
            <animated.span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
              {avgSpring.value.to((v) => `${sym}${v.toFixed(2)}`)}
            </animated.span>
            <p className="mt-2 text-xs text-muted-foreground">
              {rangeLabel}平均每日消费
            </p>
          </CardContent>
        </Card>
      )}
      {showComparisonCard && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">较昨日</span>
            </div>
            <div
              className={cn(
                'text-3xl font-semibold tracking-tight',
                delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-600' : 'text-slate-900 dark:text-gray-100'
              )}
            >
              {deltaText}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              昨日支出 {sym}{prevRangeExpense.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
