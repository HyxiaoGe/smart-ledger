/**
 * 同步状态管理器
 * 管理数据同步的状态、进度和用户反馈
 */

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict';

export interface SyncState {
  status: SyncStatus;
  message?: string;
  progress?: number;
  error?: Error;
  timestamp: number;
  operationId?: string;
}

export interface SyncNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

type SyncStateListener = (state: SyncState) => void;
type NotificationListener = (notification: SyncNotification) => void;

/**
 * 同步状态管理器
 */
export class SyncStateManager {
  private static instance: SyncStateManager;

  private currentState: SyncState = {
    status: 'idle',
    timestamp: Date.now(),
  };

  private stateListeners = new Set<SyncStateListener>();
  private notificationListeners = new Set<NotificationListener>();

  private operationStates = new Map<string, SyncState>();
  private stateHistory: SyncState[] = [];
  private maxHistorySize = 50;

  private constructor() {}

  static getInstance(): SyncStateManager {
    if (!SyncStateManager.instance) {
      SyncStateManager.instance = new SyncStateManager();
    }
    return SyncStateManager.instance;
  }

  /**
   * 订阅状态变化
   */
  onStateChange(listener: SyncStateListener): () => void {
    this.stateListeners.add(listener);
    // 立即触发一次，让监听器获取当前状态
    listener(this.currentState);

    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * 订阅通知
   */
  onNotification(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  /**
   * 更新同步状态
   */
  updateState(newState: Partial<SyncState>, operationId?: string): void {
    const state: SyncState = {
      ...this.currentState,
      ...newState,
      timestamp: Date.now(),
      operationId,
    };

    this.currentState = state;

    // 保存到历史记录
    this.stateHistory.push(state);
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    // 如果有 operationId，保存特定操作的状态
    if (operationId) {
      this.operationStates.set(operationId, state);
    }

    // 通知所有监听器
    this.stateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[SyncStateManager] Listener error:', error);
      }
    });
  }

  /**
   * 发送通知
   */
  notify(notification: Omit<SyncNotification, 'id'>): string {
    const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fullNotification: SyncNotification = { id, ...notification };

    this.notificationListeners.forEach(listener => {
      try {
        listener(fullNotification);
      } catch (error) {
        console.error('[SyncStateManager] Notification listener error:', error);
      }
    });

    return id;
  }

  /**
   * 开始同步
   */
  startSync(operationId: string, message?: string): void {
    this.updateState({
      status: 'syncing',
      message: message || '正在同步数据...',
      progress: 0,
    }, operationId);
  }

  /**
   * 同步成功
   */
  syncSuccess(operationId: string, message?: string, showNotification = true): void {
    this.updateState({
      status: 'success',
      message: message || '同步成功',
      progress: 100,
      error: undefined,
    }, operationId);

    if (showNotification) {
      this.notify({
        type: 'success',
        title: '数据已同步',
        message: message || '所有标签页的数据已更新',
        duration: 2000,
      });
    }

    // 3秒后恢复到 idle 状态
    setTimeout(() => {
      if (this.currentState.operationId === operationId) {
        this.updateState({ status: 'idle' });
      }
    }, 3000);
  }

  /**
   * 同步失败
   */
  syncError(operationId: string, error: Error, retryAction?: () => void): void {
    this.updateState({
      status: 'error',
      message: '同步失败',
      error,
      progress: undefined,
    }, operationId);

    this.notify({
      type: 'error',
      title: '同步失败',
      message: error.message || '数据同步遇到问题，请稍后重试',
      duration: 5000,
      action: retryAction ? {
        label: '重试',
        onClick: retryAction,
      } : undefined,
    });
  }

  /**
   * 检测到冲突
   */
  syncConflict(operationId: string, message: string, resolveAction?: () => void): void {
    this.updateState({
      status: 'conflict',
      message,
    }, operationId);

    this.notify({
      type: 'warning',
      title: '检测到数据冲突',
      message,
      duration: 8000,
      action: resolveAction ? {
        label: '解决冲突',
        onClick: resolveAction,
      } : undefined,
    });
  }

  /**
   * 更新同步进度
   */
  updateProgress(operationId: string, progress: number): void {
    this.updateState({
      progress: Math.min(100, Math.max(0, progress)),
    }, operationId);
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): SyncState {
    return { ...this.currentState };
  }

  /**
   * 获取特定操作的状态
   */
  getOperationState(operationId: string): SyncState | undefined {
    return this.operationStates.get(operationId);
  }

  /**
   * 获取状态历史
   */
  getHistory(limit?: number): SyncState[] {
    const history = [...this.stateHistory];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.stateHistory = [];
    this.operationStates.clear();
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.updateState({
      status: 'idle',
      message: undefined,
      progress: undefined,
      error: undefined,
    });
  }
}

export const syncStateManager = SyncStateManager.getInstance();
