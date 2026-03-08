'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCategories } from '@/contexts/CategoryContext';
import { useRefetchOnDataSync } from '@/hooks/useEnhancedDataSync';
import type { Transaction } from '@/types/domain/transaction';
import { buildTransactionPageHref } from '@/lib/services/transaction/pageParams';
import {
  resolveTransactionListRangeParams,
  useAllTransactionRowsQuery,
} from '@/lib/api/hooks/useTransactions';

type UseCollapsibleTransactionListControllerParams = {
  initialTransactions: Transaction[];
  totalCount: number;
};

const QUICK_RANGES = [
  { key: 'today', label: '今天' },
  { key: 'thisWeek', label: '本周' },
  { key: 'thisMonth', label: '本月' },
] as const;

export function useCollapsibleTransactionListController({
  initialTransactions,
  totalCount,
}: UseCollapsibleTransactionListControllerParams) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { categories } = useCategories();

  const [isExpanded, setIsExpanded] = useState(false);
  const [defaultExpandedDates, setDefaultExpandedDates] = useState<Set<string> | undefined>(
    undefined
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const initRef = useRef(false);

  const currentRange = search.get('range') || 'today';
  const currentMonth = search.get('month') || undefined;
  const currentStart = search.get('start') || undefined;
  const currentEnd = search.get('end') || undefined;

  const queryParams = useMemo(
    () =>
      resolveTransactionListRangeParams({
        month: currentMonth,
        range: currentRange,
        start: currentStart,
        end: currentEnd,
      }),
    [currentEnd, currentMonth, currentRange, currentStart]
  );

  const { data: queriedTransactions, refetch } = useAllTransactionRowsQuery(queryParams, {
    initialData: initialTransactions,
    staleTime: 0,
  });

  const transactions = queriedTransactions || initialTransactions;

  const commonCategories = useMemo(() => {
    return [...categories]
      .filter((item) => item.is_active && (item.type === 'expense' || item.type === 'both'))
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .slice(0, 6);
  }, [categories]);

  const filteredTransactions = useMemo(() => {
    if (!activeCategory) return transactions;
    return transactions.filter((item) => item.category === activeCategory);
  }, [transactions, activeCategory]);

  const displayCount = activeCategory
    ? filteredTransactions.length
    : transactions.length || totalCount;

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('records:listExpanded');
    if (stored === 'true' || stored === 'false') {
      setIsExpanded(stored === 'true');
      return;
    }
    if (totalCount <= 20) setIsExpanded(true);
  }, [totalCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('records:listExpanded', String(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    if (!transactions.length) return;
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setDefaultExpandedDates(new Set([sorted[0].date]));
  }, [transactions]);

  useEffect(() => {
    if (activeCategory && filteredTransactions.length === 0) {
      setActiveCategory(null);
    }
  }, [activeCategory, filteredTransactions]);

  const updateRange = (rangeKey: string) => {
    router.push(
      buildTransactionPageHref(pathname, search?.toString(), {
        range: rangeKey,
        start: null,
        end: null,
        month: null,
      }) as any
    );
  };

  useRefetchOnDataSync(refetch);

  return {
    isExpanded,
    setIsExpanded,
    defaultExpandedDates,
    activeCategory,
    setActiveCategory,
    currentRange,
    quickRanges: QUICK_RANGES,
    commonCategories,
    filteredTransactions,
    displayCount,
    totalCount,
    updateRange,
  };
}
