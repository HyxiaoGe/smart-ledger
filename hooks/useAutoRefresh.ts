import { useCallback, useEffect, useRef } from 'react';
import { dataSync, consumeTransactionsDirty, peekTransactionsDirty } from '@/lib/core/dataSync';
import { useRefreshQueue } from './useTransactionsSync';

type SyncType = 'transaction_added' | 'transaction_deleted' | 'transaction_updated';

type UseAutoRefreshConfig = {
  /** 延迟刷新时间数组（毫秒），默认 [1500, 3500, 6000] */
  delays?: number[];
  /** 是否监听页面可见性变化，默认 true */
  enableVisibilityCheck?: boolean;
  /** 是否在组件挂载时检查脏数据，默认 true */
  enableMountCheck?: boolean;
};

type UseAutoRefreshParams = {
  /** 要监听的数据同步事件类型数组 */
  events: SyncType[];
  /** 刷新回调函数 */
  onRefresh: () => void;
  /** 用于检测数据变化的快照对象（浅比较） */
  dataSnapshot?: Record<string, any>;
  /** 可选配置 */
  config?: UseAutoRefreshConfig;
};

const DEFAULT_DELAYS = [1500, 3500, 6000];

/**
 * 通用的自动刷新 Hook
 *
 * 功能特性：
 * 1. 监听指定的数据同步事件（如交易增删改）
 * 2. 使用渐进式延迟策略自动刷新数据
 * 3. 检测数据变化后自动停止刷新队列
 * 4. 支持页面可见性变化时刷新
 * 5. 组件挂载时检查是否有未同步的脏数据
 *
 * @example
 * ```typescript
 * const { isRefreshing } = useAutoRefresh({
 *   events: ['transaction_added', 'transaction_updated', 'transaction_deleted'],
 *   onRefresh: () => router.refresh(),
 *   dataSnapshot: {
 *     income: data.income,
 *     expense: data.expense,
 *     balance: data.balance
 *   }
 * });
 * ```
 */
export function useAutoRefresh({
  events,
  onRefresh,
  dataSnapshot,
  config = {}
}: UseAutoRefreshParams) {
  const {
    delays = DEFAULT_DELAYS,
    enableVisibilityCheck = true,
    enableMountCheck = true
  } = config;

  const { isRefreshing, triggerQueue, stopQueue } = useRefreshQueue({
    delays,
    refresh: onRefresh,
    peekDirty: peekTransactionsDirty,
    consumeDirty: consumeTransactionsDirty
  });

  // 保存上一次的数据快照
  const prevSnapshotRef = useRef<Record<string, any> | undefined>(undefined);

  // 监听数据同步事件
  useEffect(() => {
    const handler = () => {
      triggerQueue('event');
    };

    // 注册所有指定的事件监听器
    const unsubscribers = events.map(eventType =>
      dataSync.onEvent(eventType, handler)
    );

    // 组件挂载时检查是否有脏数据
    if (enableMountCheck && peekTransactionsDirty()) {
      triggerQueue('mount');
    }

    // 清理所有监听器
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      stopQueue();
    };
  }, [events, triggerQueue, stopQueue, enableMountCheck]);

  // 监听页面可见性变化
  useEffect(() => {
    if (!enableVisibilityCheck || typeof window === 'undefined') return;

    const onVisibility = () => {
      if (!document.hidden && peekTransactionsDirty()) {
        triggerQueue('visibility');
      }
    };

    window.addEventListener('visibilitychange', onVisibility);
    return () => window.removeEventListener('visibilitychange', onVisibility);
  }, [triggerQueue, enableVisibilityCheck]);

  // 检测数据变化并自动停止刷新队列
  // 使用 useMemo 包装的 dataSnapshot 确保只有数据真正变化时对象引用才会改变
  useEffect(() => {
    if (!dataSnapshot) return;

    const prevSnapshot = prevSnapshotRef.current;

    // 如果是第一次，直接保存快照，不触发 stopQueue
    if (!prevSnapshot) {
      prevSnapshotRef.current = dataSnapshot;
      return;
    }

    // 检查数据是否真的变化了
    const changed = Object.keys(dataSnapshot).some(
      key => prevSnapshot[key] !== dataSnapshot[key]
    );

    if (changed) {
      prevSnapshotRef.current = dataSnapshot;
      stopQueue({ consume: true });
    }
  }, [dataSnapshot, stopQueue]);

  return {
    /** 是否正在刷新数据 */
    isRefreshing,
    /** 手动触发刷新队列 */
    triggerRefresh: useCallback((reason = 'manual') => triggerQueue(reason), [triggerQueue]),
    /** 手动停止刷新队列 */
    stopRefresh: useCallback(() => stopQueue(), [stopQueue])
  };
}
