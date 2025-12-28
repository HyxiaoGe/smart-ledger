'use client';
import { CategoryChip } from '@/components/CategoryChip';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency } from '@/lib/utils/format';
import { Store, TrendingUp } from 'lucide-react';
import Link from 'next/link';

type Item = {
  id: string;
  category: string;
  amount: number;
  date?: string;
  note?: string;
  currency?: string;
  merchant?: string;
  subcategory?: string;
  product?: string;
};

export function TopExpenses({ items, currency }: { items: Item[]; currency: string }) {
  const buildQuickAddHref = (item: Item) => {
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
    <ul className="divide-y">
      {items.map((it, idx) => (
        <li key={it.id} className="py-2 flex items-start gap-3">
          <div className="w-6 text-xs text-muted-foreground pt-1">#{idx + 1}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <CategoryChip category={it.category} />
              <div className="font-semibold">
                {formatCurrency(Number(it.amount || 0), it.currency || currency)}
              </div>
            </div>
            <div
              className={`mt-1 text-xs text-muted-foreground flex items-center ${
                'justify-end'
              }`}
            >
              <div className="flex items-center gap-2 max-w-[60%]">
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
            </div>
            <div className="mt-2 flex items-center justify-end">
              <Link
                href={buildQuickAddHref(it)}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                再记一笔
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
