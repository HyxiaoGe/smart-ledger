'use client';
import { CategoryChip } from '@/components/CategoryChip';
import { formatCurrency } from '@/lib/utils/format';
import { Store } from 'lucide-react';

type Item = {
  id: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
  currency?: string;
  merchant?: string;
  subcategory?: string;
  product?: string;
};

export function TopExpenses({ items, currency }: { items: Item[]; currency: string }) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">暂无数据</div>;
  }
  return (
    <ul className="divide-y">
      {items.map((it, idx) => (
        <li key={it.id} className="py-2 flex items-center gap-3">
          <div className="w-6 text-xs text-muted-foreground">#{idx + 1}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <CategoryChip category={it.category} />
              <div className="font-semibold">
                {formatCurrency(Number(it.amount || 0), it.currency || currency)}
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground flex items-center justify-between">
              <span>{it.date}</span>
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
          </div>
        </li>
      ))}
    </ul>
  );
}
