/**
 * 增强版数据同步 Hook
 * 使用增强版的 DataSyncManager
 */

'use client';

import { useEffect, useState } from 'react';
import { enhancedDataSync, SyncEvent, SyncType } from '@/lib/core/EnhancedDataSync';

/**
 * 订阅数据同步事件
 * @param eventType 事件类型
 * @param callback 回调函数
 */
export function useEnhancedDataSync(
  eventType: SyncType,
  callback: (event: SyncEvent) => void
): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') {
      return undefined;
    }

    const unsubscribe = enhancedDataSync.onEvent(eventType, callback);

    return () => {
      unsubscribe();
    };
  }, [eventType, callback]);

  return mounted;
}

/**
 * 订阅所有数据同步事件
 */
export function useAllDataSyncEvents(
  callback: (event: SyncEvent) => void
): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') {
      return undefined;
    }

    // 订阅所有事件类型
    const unsubscribes = [
      enhancedDataSync.onEvent('transaction_added', callback),
      enhancedDataSync.onEvent('transaction_deleted', callback),
      enhancedDataSync.onEvent('transaction_updated', callback),
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [callback]);

  return mounted;
}
