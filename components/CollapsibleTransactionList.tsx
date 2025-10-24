'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionGroupedList } from '@/components/TransactionGroupedList';
import { List, ChevronDown, ChevronUp } from 'lucide-react';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency?: string;
  note?: string;
  date: string;
};

type CollapsibleTransactionListProps = {
  initialTransactions: Transaction[];
  totalCount: number;
  className?: string;
};

export function CollapsibleTransactionList({
  initialTransactions,
  totalCount,
  className
}: CollapsibleTransactionListProps) {
  const [expanded, setExpanded] = useState(totalCount <= 10);

  return (
    <Card className={className}>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">�˵���ϸ</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              �� {totalCount} ��
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-2"
          >
            {expanded ? '������ϸ' : 'չ����ϸ'}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {expanded ? (
          <TransactionGroupedList initialTransactions={initialTransactions} />
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/40 py-8 text-center text-sm text-muted-foreground">
            �˵���ϸ�����𣬵����չ����ϸ����ť�鿴��ϸ��¼��
          </div>
        )}

        {totalCount === 0 && (
          <div className="rounded-md border border-dashed border-border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
            �����˵���¼������������˵�����ʼ��¼֧����
          </div>
        )}
      </CardContent>
    </Card>
  );
}
