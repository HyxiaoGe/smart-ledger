"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  note?: string;
  currency?: string;
};

type TransactionGroupedListProps = {
  initialTransactions: Transaction[];
};

export function TransactionGroupedList({ initialTransactions }: TransactionGroupedListProps) {
  if (!initialTransactions.length) {
    return <div className="text-sm text-muted-foreground">暂无账单记录。</div>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {initialTransactions.map((transaction) => (
        <Card key={transaction.id}>
          <CardContent className="space-y-2 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{transaction.date}</div>
              <div className="text-xs text-rose-500 font-medium">支出</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">{transaction.category}</div>
              <div className="text-base font-semibold text-foreground">
                {formatCurrency(transaction.amount, transaction.currency || 'CNY')}
              </div>
            </div>
            {transaction.note ? (
              <div className="text-xs text-muted-foreground">备注：{transaction.note}</div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
