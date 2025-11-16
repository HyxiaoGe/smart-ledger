/**
 * 增强版数据同步管理器
 * 集成状态管理、错误处理、重试机制和冲突检测
 */

'use client';

import { syncStateManager } from './SyncStateManager';
import { removeItem, writeJSON, readString, writeString, hasStorageQuota } from '@/lib/utils/storage';
import { AppError, ErrorCode } from '@/lib/domain/errors';

export type SyncType = 'transaction_added' | 'transaction_deleted' | 'transaction_updated';

export interface SyncEvent {
  type: SyncType;
  timestamp: number;
  data?: unknown;
  operationId?: string;
  confirmed?: boolean;
  retryCount?: number;
  version?: number;  // 用于冲突检测
}

export interface SyncConfig {
  debounceTime?: number;
  cleanupDelay?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableConflictDetection?: boolean;
}

const DEFAULT_CONFIG: Required<SyncConfig> = {
  debounceTime: 300,
  cleanupDelay: 200,
  maxRetries: 3,
  retryDelay: 1000,
  enableConflictDetection: true,
};

const STORAGE_KEY = 'smart-ledger-sync-event';
const DIRTY_KEY = 'smart-ledger-transactions-dirty';
const VERSION_KEY = 'smart-ledger-data-version';
const LOCK_KEY = 'smart-ledger-sync-lock';
const LOCK_TIMEOUT = 5000; // 5秒锁超时

/**
 * 增强版数据同步管理器
 */
export class EnhancedDataSyncManager {
  private static instance: EnhancedDataSyncManager;

  private listeners = new Map<SyncType, Array<(event: SyncEvent) => void>>();
  private eventQueue: SyncEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private config: Required<SyncConfig>;

  // 重试队列
  private retryQueue = new Map<string, {
    event: SyncEvent;
    retryCount: number;
    timer: ReturnType<typeof setTimeout>;
  }>();

  // 数据版本（用于冲突检测）
  private dataVersion = 0;

  private constructor(config?: SyncConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
      // 初始化数据版本
      this.dataVersion = parseInt(readString(VERSION_KEY, '0'), 10);
    }
  }

  static getInstance(config?: SyncConfig): EnhancedDataSyncManager {
    if (!EnhancedDataSyncManager.instance) {
      EnhancedDataSyncManager.instance = new EnhancedDataSyncManager(config);
    }
    return EnhancedDataSyncManager.instance;
  }

  /**
   * 订阅同步事件
   */
  onEvent(eventType: SyncType, callback: (event: SyncEvent) => void): () => void {
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

  /**
   * 处理 storage 事件
   */
  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;

    try {
      const parsed = JSON.parse(event.newValue) as SyncEvent;
      this.notify(parsed);
    } catch (error) {
      // 记录错误但不影响其他操作
      console.error('[DataSync] Failed to parse storage event:', error);

      if (error instanceof Error) {
        syncStateManager.syncError(
          'storage-parse-error',
          new AppError(ErrorCode.VALIDATION_ERROR, '同步数据格式错误', [], {
            originalError: error.message,
          })
        );
      }
    }
  };

  /**
   * 通知监听器
   */
  private notify(event: SyncEvent): void {
    const callbacks = this.listeners.get(event.type);
    if (!callbacks || callbacks.length === 0) return;

    callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('[DataSync] Listener error:', error);

        // 不阻止其他监听器执行，但记录错误
        if (error instanceof Error) {
          syncStateManager.syncError(
            event.operationId || 'unknown',
            new AppError(ErrorCode.INTERNAL_ERROR, '同步回调执行失败', [], {
              originalError: error.message,
              eventType: event.type,
            })
          );
        }
      }
    });
  }

  /**
   * 发送同步事件
   */
  private emit(event: Omit<SyncEvent, 'timestamp' | 'version'>): void {
    const payload: SyncEvent = {
      ...event,
      timestamp: Date.now(),
      version: this.dataVersion,
    };

    // 添加到队列
    this.eventQueue.push(payload);

    // 防抖处理
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flushEvents();
    }, this.config.debounceTime);
  }

  /**
   * 获取同步锁
   */
  private async acquireLock(operationId: string): Promise<boolean> {
    if (typeof window === 'undefined') return true;

    try {
      const lockData = readString(LOCK_KEY, '');

      if (lockData) {
        const lock = JSON.parse(lockData);
        const now = Date.now();

        // 检查锁是否过期
        if (now - lock.timestamp < LOCK_TIMEOUT) {
          return false; // 锁被占用
        }
      }

      // 获取锁
      writeString(LOCK_KEY, JSON.stringify({
        operationId,
        timestamp: Date.now(),
      }));

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 释放同步锁
   */
  private releaseLock(): void {
    if (typeof window === 'undefined') return;
    removeItem(LOCK_KEY);
  }

  /**
   * 批量发送事件
   */
  private async flushEvents(): Promise<void> {
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

    // 清空队列
    this.eventQueue = [];
    this.flushTimer = null;

    // 发送合并后的事件
    for (const event of mergedEvents.values()) {
      await this.sendEvent(event);
    }
  }

  /**
   * 发送单个事件
   */
  private async sendEvent(event: SyncEvent): Promise<void> {
    const operationId = event.operationId || this.newOperationId();

    try {
      // 检查存储配额
      if (!hasStorageQuota()) {
        throw new AppError(
          ErrorCode.STORAGE_QUOTA_EXCEEDED,
          'localStorage 存储空间不足',
          [],
          { eventType: event.type }
        );
      }

      // 尝试获取锁
      const lockAcquired = await this.acquireLock(operationId);

      if (!lockAcquired && this.config.enableConflictDetection) {
        // 检测到冲突
        syncStateManager.syncConflict(
          operationId,
          '另一个标签页正在同步数据，请稍候',
          () => this.sendEvent(event) // 提供重试操作
        );
        return;
      }

      // 开始同步
      syncStateManager.startSync(operationId);

      // 写入存储
      writeJSON(STORAGE_KEY, event);

      // 通知本地监听器
      this.notify(event);

      // 增加数据版本
      this.dataVersion++;
      writeString(VERSION_KEY, String(this.dataVersion));

      // 标记数据为脏
      markTransactionsDirty();

      // 延迟清理，确保其他标签页能读取到
      setTimeout(() => {
        removeItem(STORAGE_KEY);
        this.releaseLock();
      }, this.config.cleanupDelay);

      // 同步成功
      syncStateManager.syncSuccess(operationId, undefined, false); // 不显示通知，避免打扰用户

      // 从重试队列中移除（如果存在）
      this.removeFromRetryQueue(operationId);

    } catch (error) {
      console.error('[DataSync] Send event failed:', error);

      // 释放锁
      this.releaseLock();

      // 如果是 AppError，直接使用；否则包装为 AppError
      const appError = error instanceof AppError
        ? error
        : new AppError(
            ErrorCode.SYNC_ERROR,
            '数据同步失败',
            [],
            { originalError: error instanceof Error ? error.message : String(error) }
          );

      // 添加到重试队列
      this.addToRetryQueue(operationId, event, appError);
    }
  }

  /**
   * 添加到重试队列
   */
  private addToRetryQueue(operationId: string, event: SyncEvent, error: AppError): void {
    const existing = this.retryQueue.get(operationId);
    const retryCount = (existing?.retryCount ?? event.retryCount ?? 0) + 1;

    // 清除旧的定时器
    if (existing) {
      clearTimeout(existing.timer);
    }

    // 检查是否超过最大重试次数
    if (retryCount > this.config.maxRetries) {
      syncStateManager.syncError(operationId, error);
      this.retryQueue.delete(operationId);
      return;
    }

    // 计算延迟时间（指数退避）
    const delay = this.config.retryDelay * Math.pow(2, retryCount - 1);

    // 添加到重试队列
    const timer = setTimeout(() => {
      console.log(`[DataSync] Retrying operation ${operationId} (attempt ${retryCount})`);
      this.sendEvent({ ...event, retryCount });
    }, delay);

    this.retryQueue.set(operationId, {
      event,
      retryCount,
      timer,
    });

    // 通知用户正在重试
    syncStateManager.updateState({
      status: 'syncing',
      message: `正在重试同步... (${retryCount}/${this.config.maxRetries})`,
    }, operationId);
  }

  /**
   * 从重试队列中移除
   */
  private removeFromRetryQueue(operationId: string): void {
    const item = this.retryQueue.get(operationId);
    if (item) {
      clearTimeout(item.timer);
      this.retryQueue.delete(operationId);
    }
  }

  /**
   * 生成操作 ID
   */
  private newOperationId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  /**
   * 通知交易已添加
   */
  notifyTransactionAdded(data?: unknown, confirmed = true): string {
    const operationId = this.newOperationId();
    this.emit({ type: 'transaction_added', data, confirmed, operationId });
    return operationId;
  }

  /**
   * 通知交易已删除
   */
  notifyTransactionDeleted(data?: unknown, confirmed = true): string {
    const operationId = this.newOperationId();
    this.emit({ type: 'transaction_deleted', data, confirmed, operationId });
    return operationId;
  }

  /**
   * 通知交易已更新
   */
  notifyTransactionUpdated(data?: unknown, confirmed = true): string {
    const operationId = this.newOperationId();
    this.emit({ type: 'transaction_updated', data, confirmed, operationId });
    return operationId;
  }

  /**
   * 获取当前数据版本
   */
  getDataVersion(): number {
    return this.dataVersion;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }

    // 清理所有定时器
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.retryQueue.forEach(item => clearTimeout(item.timer));
    this.retryQueue.clear();

    this.listeners.clear();
    this.eventQueue = [];
  }
}

// 脏数据标记函数
export function markTransactionsDirty(): void {
  if (typeof window === 'undefined') return;
  writeString(DIRTY_KEY, String(Date.now()));
}

export function consumeTransactionsDirty(): boolean {
  if (typeof window === 'undefined') return false;
  const value = readString(DIRTY_KEY, '');
  if (value) {
    removeItem(DIRTY_KEY);
    return true;
  }
  return false;
}

export function peekTransactionsDirty(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(readString(DIRTY_KEY, ''));
}

// 导出单例实例
export const enhancedDataSync = EnhancedDataSyncManager.getInstance();
