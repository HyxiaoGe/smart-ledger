/* eslint-disable */
"use client";

import { useEffect, useState } from 'react';
import { removeItem, writeJSON, readString, writeString } from '@/lib/storage';

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
const SYNC_DEBOUNCE_TIME = 500;

export class DataSyncManager {
  private static instance: DataSyncManager;
  private listeners = new Map<SyncType, Array<(event: SyncEvent) => void>>();
  private lastEventTime = 0;

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
    const now = Date.now();
    if (now - this.lastEventTime < SYNC_DEBOUNCE_TIME) {
      return;
    }
    this.lastEventTime = now;

    const payload: SyncEvent = { ...event, timestamp: now };
    writeJSON(STORAGE_KEY, payload);
    setTimeout(() => removeItem(STORAGE_KEY), 100);
    this.notify(payload);
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

