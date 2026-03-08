'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { consumeTransactionsDirty, peekTransactionsDirty } from '@/lib/core/EnhancedDataSync';
import {
  useRefreshQueue,
  useStopRefreshQueueOnSnapshotChange,
  useTransactionRefreshLifecycle,
} from '@/hooks/useTransactionsSync';
import { buildSingleDayTransactionPageHref } from '@/lib/services/transaction/pageParams';

const REFRESH_DELAYS_MS = [1500, 3500, 6000];

export function useHomeDashboardController(refreshSnapshot: string) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const refreshCallback = useCallback(() => router.refresh(), [router]);
  const { isRefreshing, triggerQueue, stopQueue } = useRefreshQueue({
    delays: REFRESH_DELAYS_MS,
    refresh: refreshCallback,
    peekDirty: peekTransactionsDirty,
    consumeDirty: consumeTransactionsDirty,
  });

  useTransactionRefreshLifecycle({
    triggerQueue,
    stopQueue,
    peekDirty: peekTransactionsDirty,
  });

  useStopRefreshQueueOnSnapshotChange({
    refreshSnapshot,
    stopQueue,
  });

  const handleCalendarDayClick = useCallback(
    (dateStr: string) => {
      router.push(buildSingleDayTransactionPageHref(pathname, search?.toString(), dateStr) as any);
    },
    [router, pathname, search]
  );

  return {
    isRefreshing,
    handleCalendarDayClick,
  };
}
