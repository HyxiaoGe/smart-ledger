"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataSync } from '@/lib/dataSync';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/config';
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
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
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
    .select('type, category, amount, date, currency')
    .is('deleted_at', null)
    .gte('date', start)
    .lt('date', end)
    .eq('currency', currency);

  const rows = cur.data || [];
  const sum = (arr: any[], pred: (r: any) => boolean) => arr.filter(pred).reduce((a, b) => a + Number(b.amount || 0), 0);

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
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const sym = symbolOf(currency);

  // 监听数据同步事件
  useDataSync('transaction_added', (event) => {
    if (event.confirmed) {
      console.log('收到已确认的账单添加事件，刷新统计数据', event);
      refreshStats();
    } else {
      console.log('收到未确认的账单添加事件，跳过刷新', event);
    }
  }, []);

  useDataSync('transaction_deleted', (event) => {
    if (event.confirmed) {
      console.log('收到已确认的账单删除事件，刷新统计数据', event);
      refreshStats();
    } else {
      console.log('收到未确认的账单删除事件，跳过刷新', event);
    }
  }, []);

  useDataSync('transaction_updated', (event) => {
    if (event.confirmed) {
      console.log('收到已确认的账单更新事件，刷新统计数据', event);
      refreshStats();
    } else {
      console.log('收到未确认的账单更新事件，跳过刷新', event);
    }
  }, []);

  // 刷新统计数据
  const refreshStats = async () => {
    // 防抖：如果距离上次更新时间太短，则跳过
    const now = Date.now();
    if (now - lastUpdate < 1000) {
      console.log('刷新间隔太短，跳过此次刷新');
      return;
    }

    setIsRefreshing(true);
    setLastUpdate(now);

    try {
      const newData = await loadCurrentMonthData(currency);
      setIncome(newData.income);
      setExpense(newData.expense);
      setBalance(newData.balance);

      // 对于范围支出，由于不知道具体的范围参数，这里先简化处理
      // 在实际使用中，可以根据当前的路由参数重新计算
      console.log('统计数据已更新', newData);

    } catch (error) {
      console.error('刷新统计数据失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 范围支出卡片 */}
      <Card className="relative">
        {isRefreshing && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            {rangeLabel}支出
            {isRefreshing && <span className="text-xs text-blue-500">更新中...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold transition-all duration-300">
            {`${sym}${rangeExpense.toFixed(2)}`}
          </div>
        </CardContent>
      </Card>

      {/* 本月支出卡片 */}
      <Card className="relative">
        {isRefreshing && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            本月支出 ({monthLabel})
            {isRefreshing && <span className="text-xs text-blue-500">更新中...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold transition-all duration-300">
            {`${sym}${expense.toFixed(2)}`}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}