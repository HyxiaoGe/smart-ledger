/* eslint-disable */
'use client';

import React, { useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SUPPORTED_CURRENCIES } from '@/lib/config/config';

interface HomeStatsProps {
  initialIncome: number;
  initialExpense: number;
  initialBalance: number;
  initialRangeExpense: number;
  currency: string;
  rangeLabel: string;
  monthLabel: string;
}

function symbolOf(code: string) {
  const found = SUPPORTED_CURRENCIES.find((item) => item.code === code);
  return found?.symbol ?? '';
}

export function HomeStats({
  initialIncome,
  initialExpense,
  initialBalance,
  initialRangeExpense,
  currency,
  rangeLabel,
  monthLabel
}: HomeStatsProps) {
  const sym = symbolOf(currency);

  const [rangeSpring, rangeApi] = useSpring(() => ({
    value: initialRangeExpense,
    config: { tension: 180, friction: 24 }
  }));

  const [monthSpring, monthApi] = useSpring(() => ({
    value: initialExpense,
    config: { tension: 180, friction: 24 }
  }));

  // 当props变化时，更新动画值
  useEffect(() => {
    rangeApi.start({ value: initialRangeExpense });
  }, [initialRangeExpense, rangeApi]);

  useEffect(() => {
    monthApi.start({ value: initialExpense });
  }, [initialExpense, monthApi]);

  
  const renderCard = (title: string, valueSpring: typeof rangeSpring, suffix?: string) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <animated.span className="text-3xl font-semibold tracking-tight text-slate-900">
          {valueSpring.value.to((v) => `${sym}${v.toFixed(2)}`)}
        </animated.span>
        {suffix ? <p className="mt-2 text-xs text-muted-foreground">{suffix}</p> : null}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {renderCard(rangeLabel, rangeSpring)}
      {renderCard('本月支出', monthSpring, `${monthLabel} 的累计支出`)}
    </div>
  );
}
