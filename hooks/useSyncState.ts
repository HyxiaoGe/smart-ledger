/**
 * 同步状态 Hook
 * 用于组件订阅和使用同步状态
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { syncStateManager, SyncState, SyncNotification } from '@/lib/core/SyncStateManager';

/**
 * 订阅同步状态
 */
export function useSyncState() {
  const [state, setState] = useState<SyncState>(syncStateManager.getCurrentState());

  useEffect(() => {
    const unsubscribe = syncStateManager.onStateChange(setState);
    return unsubscribe;
  }, []);

  return state;
}

/**
 * 订阅同步通知
 */
export function useSyncNotifications(onNotification?: (notification: SyncNotification) => void) {
  const [notifications, setNotifications] = useState<SyncNotification[]>([]);

  useEffect(() => {
    const unsubscribe = syncStateManager.onNotification((notification) => {
      setNotifications(prev => [...prev, notification]);
      onNotification?.(notification);

      // 自动移除过期通知
      if (notification.duration) {
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, notification.duration);
      }
    });

    return unsubscribe;
  }, [onNotification]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    removeNotification,
  };
}

/**
 * 同步状态控制 Hook
 */
export function useSyncControls() {
  const startSync = useCallback((operationId: string, message?: string) => {
    syncStateManager.startSync(operationId, message);
  }, []);

  const syncSuccess = useCallback((operationId: string, message?: string, showNotification = true) => {
    syncStateManager.syncSuccess(operationId, message, showNotification);
  }, []);

  const syncError = useCallback((operationId: string, error: Error, retryAction?: () => void) => {
    syncStateManager.syncError(operationId, error, retryAction);
  }, []);

  const syncConflict = useCallback((operationId: string, message: string, resolveAction?: () => void) => {
    syncStateManager.syncConflict(operationId, message, resolveAction);
  }, []);

  const updateProgress = useCallback((operationId: string, progress: number) => {
    syncStateManager.updateProgress(operationId, progress);
  }, []);

  const reset = useCallback(() => {
    syncStateManager.reset();
  }, []);

  return {
    startSync,
    syncSuccess,
    syncError,
    syncConflict,
    updateProgress,
    reset,
  };
}
