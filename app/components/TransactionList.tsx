"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryChip } from '@/components/CategoryChip';
import { formatCurrency } from '@/lib/format';
import { EmptyState } from '@/components/EmptyState';

type Row = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency?: string;
  note?: string;
  date: string;
};

type TransactionListProps = {
  initialRows?: Row[];
  start?: string;
  end?: string;
};

export function TransactionList({ initialRows = [], start, end }: TransactionListProps) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!start || !end) return;

    let cancelled = false;
    const fetchRows = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: fetchError } = await supabase
          .from('transactions')
          .select('*')
          .is('deleted_at', null)
          .eq('type', 'expense')
          .gte('date', start)
          .lt('date', end)
          .order('date', { ascending: false })
          .limit(100);

        if (!cancelled) {
          if (fetchError) {
            setError('加载账单失败，请稍后重试');
          } else if (data) {
            setRows(data as Row[]);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRows();
    return () => {
      cancelled = true;
    };
  }, [start, end]);

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const keyword = query.trim().toLowerCase();
    return rows.filter((row) =>
      [row.category, row.note, row.currency]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(keyword))
    );
  }, [query, rows]);

  if (!loading && filteredRows.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <Input
              placeholder="搜索分类/备注/币种"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {error ? <EmptyState description={error} /> : <EmptyState description="暂无账单记录" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <Input
            placeholder="搜索分类/备注/币种"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {error ? (
          <div className="p-4 text-sm text-destructive">{error}</div>
        ) : null}
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">加载中…</div>
        ) : null}
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">日期</th>
              <th className="px-4 py-2 text-left">分类</th>
              <th className="px-4 py-2 text-right">金额</th>
              <th className="px-4 py-2 text-left">币种</th>
              <th className="px-4 py-2 text-left">备注</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                <td className="px-4 py-3 align-top text-muted-foreground">{row.date}</td>
                <td className="px-4 py-3 align-top"><CategoryChip category={row.category} /></td>
                <td className="px-4 py-3 align-top text-right font-semibold">{formatCurrency(row.amount, row.currency || 'CNY')}</td>
                <td className="px-4 py-3 align-top text-muted-foreground">{row.currency || 'CNY'}</td>
                <td className="px-4 py-3 align-top text-muted-foreground">{row.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
