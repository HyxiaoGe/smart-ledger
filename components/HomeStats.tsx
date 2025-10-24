/* eslint-disable */
'use client';

import React, { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataSync } from '@/lib/dataSync';
import { SUPPORTED_CURRENCIES } from '@/lib/config';
import { supabase } from '@/lib/supabaseClient';

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

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toISO(start), end: toISO(end) };
}

async function loadCurrentMonthData(currency: string) {
  const { start, end } = monthRange(new Date());
  const cur = await supabase
    .from('transactions')
    .select('type, amount')
    .is('deleted_at', null)
    .gte('date', start)
    .lt('date', end)
    .eq('currency', currency);

  const rows = cur.data || [];
  const sum = (arr: any[], pred: (r: any) => boolean) =>
    arr.filter(pred).reduce((a, b) => a + Number(b.amount || 0), 0);

  const income = sum(rows, (r) => r.type === 'income');
  const expense = sum(rows, (r) => r.type === 'expense');
  const balance = income - expense;

  return { income, expense, balance };
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
  const [income, setIncome] = useState(initialIncome);
  const [expense, setExpense] = useState(initialExpense);
  const [balance, setBalance] = useState(initialBalance);
  const [rangeExpense, setRangeExpense] = useState(initialRangeExpense);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);

  const sym = symbolOf(currency);

  const rangeSpring = useSpring({
    value: rangeExpense,
    config: { tension: 180, friction: 24 }
  });

  const monthSpring = useSpring({
    value: expense,
    config: { tension: 180, friction: 24 }
  });

  useEffect(() => {
    setIncome(initialIncome);
    setBalance(initialBalance);

    setRangeExpense(initialRangeExpense);
    setExpense(initialExpense);
  }, [initialIncome, initialExpense, initialBalance, initialRangeExpense]);

  const refreshStats = async () => {
    const now = Date.now();
    if (now - lastUpdate < 1000) {
      return;
    }

    setIsRefreshing(true);
    setLastUpdate(now);

    try {
      const newData = await loadCurrentMonthData(currency);
      setIncome(newData.income);
      setExpense(newData.expense);
      setBalance(newData.balance);
    } catch {
      setLastUpdate(0);
    } finally {
      setIsRefreshing(false);
    }
  };

  useDataSync(
    'transaction_added',
    (event) => {
      if (event.confirmed) {
        void refreshStats();
      }
    },
    []
  );

  useDataSync(
    'transaction_deleted',
    (event) => {
      if (event.confirmed) {
        void refreshStats();
      }
    },
    []
  );

  useDataSync(
    'transaction_updated',
    (event) => {
      if (event.confirmed) {
        void refreshStats();
      }
    },
    []
  );

  const renderCard = (title: string, valueSpring: typeof rangeSpring, suffix?: string) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        {isRefreshing ? (
          <span className="text-xs text-blue-500 animate-pulse">Refreshing...</span>
        ) : null}
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
