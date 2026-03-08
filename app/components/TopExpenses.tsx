'use client';
import { CategoryChip } from '@/components/CategoryChip';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency } from '@/lib/utils/format';
import { Store, TrendingUp } from 'lucide-react';
import type { TopExpenseItem, TopExpensesProps } from '@/lib/types/transactionViews';
import Link from 'next/link';

export function TopExpenses({ items, currency }: TopExpensesProps) {
  const buildQuickAddHref = (item: TopExpenseItem) => {
    const query: Record<string, string> = { category: item.category };
    const isAggregate = item.id.endsWith('-agg');
    if (!isAggregate) {
      if (item.amount) query.amount = String(item.amount);
      if (item.note && !item.note.startsWith('共')) query.note = item.note;
      if (item.merchant) query.merchant = item.merchant;
      if (item.currency) query.currency = item.currency;
    }
    return { pathname: '/add' as const, query };
  };

  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="暂无支出记录"
        description="开始记账后，这里将显示您的 Top 10 支出"
        action={
          <Link
            href="/add"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            立即记一笔
          </Link>
        }
        className="border-dashed"
      />
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((it, idx) => (
        <li
          key={it.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-400 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
              #{idx + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <CategoryChip category={it.category} />
                <div className="text-base font-semibold">
                  {formatCurrency(Number(it.amount || 0), it.currency || currency)}
                </div>
              </div>
              <div
                className={`mt-3 flex items-center text-xs text-muted-foreground ${
                  it.merchant || it.note ? 'justify-between' : 'justify-end'
                }`}
              >
                {it.merchant || it.note ? (
                  <div className="flex max-w-[72%] items-center gap-2">
                    {it.merchant && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Store className="h-3 w-3" />
                        <span className="font-medium">{it.merchant}</span>
                      </div>
                    )}
                    {it.note && (
                      <span className="truncate" title={it.note}>
                        {it.note}
                      </span>
                    )}
                  </div>
                ) : null}
                <Link
                  href={buildQuickAddHref(it)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  再记一笔
                </Link>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
