/* eslint-disable */
'use client';

import { useEffect, useState } from 'react';
import { removeItem, writeJSON, readString, writeString } from '@/lib/utils/storage';

type SyncType = 'transaction_added' | 'transaction_deleted' | 'transaction_updated';

export type SyncEvent = {
  type: SyncType;
  timestamp: number;
  data?: unknown;
  operationId?: string;
  confirmed?: boolean;
};

const STORAGE_KEY = 'smart-ledger-sync-event';
const DIRTY_KEY = 'smart-ledger-transactions-dirty';
const SYNC_DEBOUNCE_TIME = 300; // 降低到 300ms，提高响应速度
const STORAGE_CLEANUP_DELAY = 200; // 增加到 200ms，确保其他标签页能读取到

export class DataSyncManager {
  private static instance: DataSyncManager;
  private listeners = new Map<SyncType, Array<(event: SyncEvent) => void>>();
  private eventQueue: SyncEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  static getInstance() {
    if (!DataSyncManager.instance) {
      DataSyncManager.instance = new DataSyncManager();
    }
    return DataSyncManager.instance;
  }

  onEvent(eventType: SyncType, callback: (event: SyncEvent) => void) {
    const callbacks = this.listeners.get(eventType) ?? [];
    callbacks.push(callback);
    this.listeners.set(eventType, callbacks);

    return () => {
      const existing = this.listeners.get(eventType);
      if (!existing) return;
      this.listeners.set(
        eventType,
        existing.filter((item) => item !== callback)
      );
    };
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue) as SyncEvent;
      this.notify(parsed);
    } catch {
      // ignore malformed payload
    }
  };

  private notify(event: SyncEvent) {
    const callbacks = this.listeners.get(event.type);
    if (!callbacks) return;
    callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch {
        // ignore listener error
      }
    });
  }

  private emit(event: Omit<SyncEvent, 'timestamp'>) {
    const payload: SyncEvent = { ...event, timestamp: Date.now() };

    // 添加到队列而不是丢弃
    this.eventQueue.push(payload);

    // 防抖处理：延迟执行批量发送
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flushEvents();
    }, SYNC_DEBOUNCE_TIME);
  }

  /**
   * 批量发送队列中的事件
   * 合并相同类型的事件，避免重复通知
   */
  private flushEvents() {
    if (this.eventQueue.length === 0) {
      this.flushTimer = null;
      return;
    }

    // 合并相同类型的事件（保留最新的）
    const mergedEvents = new Map<SyncType, SyncEvent>();
    this.eventQueue.forEach(event => {
      const existing = mergedEvents.get(event.type);
      if (!existing || event.timestamp > existing.timestamp) {
        mergedEvents.set(event.type, event);
      }
    });

    // 发送合并后的事件
    mergedEvents.forEach(event => {
      writeJSON(STORAGE_KEY, event);
      this.notify(event);

      // 延迟清理，确保其他标签页能读取到
      setTimeout(() => removeItem(STORAGE_KEY), STORAGE_CLEANUP_DELAY);
    });

    // 清空队列
    this.eventQueue = [];
    this.flushTimer = null;
  }

  private newOperationId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  notifyTransactionAdded(data?: unknown, confirmed = true) {
    const operationId = this.newOperationId();
    this.emit({ type: 'transaction_added', data, confirmed, operationId });
    return operationId;
  }

  notifyTransactionDeleted(data?: unknown, confirmed = true) {
    const operationId = this.newOperationId();
    this.emit({ type: 'transaction_deleted', data, confirmed, operationId });
    return operationId;
  }

  notifyTransactionUpdated(data?: unknown, confirmed = true) {
    const operationId = this.newOperationId();
    this.emit({ type: 'transaction_updated', data, confirmed, operationId });
    return operationId;
  }
}

export const dataSync = DataSyncManager.getInstance();

export function markTransactionsDirty() {
  if (typeof window === 'undefined') return;
  writeString(DIRTY_KEY, String(Date.now()));
}

export function consumeTransactionsDirty() {
  if (typeof window === 'undefined') return false;
  const value = readString(DIRTY_KEY, '');
  if (value) {
    removeItem(DIRTY_KEY);
    return true;
  }
  return false;
}

export function peekTransactionsDirty() {
  if (typeof window === 'undefined') return false;
  return Boolean(readString(DIRTY_KEY, ''));
}

export function useDataSync(eventType: SyncType, callback: (event: SyncEvent) => void) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') {
      return undefined;
    }

    const unsubscribe = dataSync.onEvent(eventType, callback);
    return () => {
      unsubscribe();
    };
  }, [eventType, callback]);

  return mounted;
}
