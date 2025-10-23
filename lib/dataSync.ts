"use client";

import React from 'react';
import { removeItem, writeJSON, readString, writeString } from '@/lib/storage';

/**
 * 跨页面数据同步工具
 * 使用 localStorage 和 storage 事件实现跨标签页/窗口的数据同步
 */

export type SyncEvent = {
  type: 'transaction_added' | 'transaction_deleted' | 'transaction_updated';
  timestamp: number;
  data?: any;
  operationId?: string; // 用于追踪具体操作
  confirmed?: boolean;  // 操作是否已确认成功
};

const STORAGE_KEY = 'smart-ledger-sync-event';
const SYNC_DEBOUNCE_TIME = 500; // 500ms 防抖

export class DataSyncManager {
  private static instance: DataSyncManager;
  private listeners: Map<string, ((event: SyncEvent) => void)[]> = new Map();
  private lastEventTime: number = 0;

  private constructor() {
    // 监听 storage 事件（跨标签页同步）
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }

  static getInstance(): DataSyncManager {
    if (!DataSyncManager.instance) {
      DataSyncManager.instance = new DataSyncManager();
    }
    return DataSyncManager.instance;
  }

  /**
   * 注册事件监听器
   */
  onEvent(eventType: SyncEvent['type'], callback: (event: SyncEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const callbacks = this.listeners.get(eventType)!;
    callbacks.push(callback);

    // 返回取消监听的函数
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 触发同步事件
   */
  triggerEvent(event: Omit<SyncEvent, 'timestamp'>) {
    const syncEvent: SyncEvent = {
      ...event,
      timestamp: Date.now()
    };

    // 防抖处理
    const now = Date.now();
    if (now - this.lastEventTime < SYNC_DEBOUNCE_TIME) {
      return;
    }
    this.lastEventTime = now;

    // 存储到 localStorage（触发 storage 事件）
    writeJSON(STORAGE_KEY, syncEvent);
    // 立即清除，避免重复触�?
    setTimeout(() => {
      removeItem(STORAGE_KEY);
    }, 100);

    // 同时通知当前页面的监听器
    this.notifyListeners(syncEvent);
  }

  /**
   * 生成操作ID
   */
  private generateOperationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 通知账单添加事件（操作完成并确认后调用）
   */
  notifyTransactionAdded(data?: any, confirmed: boolean = true) {
    const operationId = this.generateOperationId();
    this.triggerEvent({
      type: 'transaction_added',
      data,
      operationId,
      confirmed
    });
    return operationId;
  }

  /**
   * 通知账单删除事件（操作完成并确认后调用）
   */
  notifyTransactionDeleted(data?: any, confirmed: boolean = true) {
    const operationId = this.generateOperationId();
    this.triggerEvent({
      type: 'transaction_deleted',
      data,
      operationId,
      confirmed
    });
    return operationId;
  }

  /**
   * 通知账单更新事件（操作完成并确认后调用）
   */
  notifyTransactionUpdated(data?: any, confirmed: boolean = true) {
    const operationId = this.generateOperationId();
    this.triggerEvent({
      type: 'transaction_updated',
      data,
      operationId,
      confirmed
    });
    return operationId;
  }

  /**
   * 处理 storage 事件（跨标签页）
   */
  private handleStorageEvent(event: StorageEvent) {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const syncEvent: SyncEvent = JSON.parse(event.newValue);
        this.notifyListeners(syncEvent);
      } catch {
        // ignore malformed sync events
      }
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(event: SyncEvent) {
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch {
          // ignore listener failures
        }
      });
    }
  }

}

// 导出单例实例
export const dataSync = DataSyncManager.getInstance();

const DIRTY_KEY = 'smart-ledger-transactions-dirty';

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

// 导出便捷 Hook
export function useDataSync(
  eventType: SyncEvent['type'],
  callback: (event: SyncEvent) => void,
  deps: React.DependencyList = []
) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    const unsubscribe = dataSync.onEvent(eventType, callback);

    return () => {
      unsubscribe();
    };
  }, deps);

  return mounted;
}
