"use client";

import { readJSON, writeJSON, removeItem } from '@/lib/storage';

/**
 * 通用任务队列管理器
 * 支持去重、重试、持久化等功能
 */

export interface QueueTask<T = any> {
  id: string;
  type: string;  // 任务类型，如 'transaction_submit'
  data: T;      // 任务数据
  key: string;  // 用于去重的key
  executor: (data: T) => Promise<any>;  // 执行函数
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  lastError?: string;
}

export interface QueueConfig {
  processDelay: number;        // 处理间隔
  retryDelay: number;          // 重试延迟
  dedupeWindow: number;        // 去重时间窗口(ms)
  maxRetries: number;          // 最大重试次数
  onTaskComplete?: (task: QueueTask) => void;
  onTaskFailed?: (task: QueueTask) => void;
  onTaskProgress?: (task: QueueTask) => void;
  storageKey?: string;         // localStorage存储key
}

export class TaskQueue {
  private config: QueueConfig;
  private queue: QueueTask[] = [];
  private isProcessing = false;
  private processTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;

  // 事件监听器
  private listeners: {
    complete: ((task: QueueTask) => void)[];
    failed: ((task: QueueTask) => void)[];
    progress: ((task: QueueTask) => void)[];
  } = {
    complete: [],
    failed: [],
    progress: []
  };

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      processDelay: 1000,
      retryDelay: 3000,
      dedupeWindow: 500,
      maxRetries: 3,
      storageKey: 'task-queue',
      ...config
    };

    // 从localStorage恢复队列
    this.loadFromStorage();

    // 监听页面关闭，保存队列
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }

  /**
   * 添加任务到队列
   */
  addTask<T>(task: Omit<QueueTask<T>, 'id' | 'status' | 'timestamp' | 'retryCount'>): string {
    const now = Date.now();

    // 检查去重
    if (this.isDuplicate(task.type, task.key, now)) {
      return '';
    }

    const fullTask: QueueTask<T> = {
      ...task,
      id: this.generateTaskId(),
      status: 'pending',
      timestamp: now,
      retryCount: 0,
      maxRetries: task.maxRetries || this.config.maxRetries
    };

    this.queue.push(fullTask);
    this.saveToStorage();

    // 开始处理队列
    this.startProcessing();

    return fullTask.id;
  }

  /**
   * 检查是否为重复任务
   */
  private isDuplicate(type: string, key: string, timestamp: number): boolean {
    const dedupeWindow = this.config.dedupeWindow;
    return this.queue.some(task =>
      task.type === type &&
      task.key === key &&
      task.status !== 'completed' &&
      (timestamp - task.timestamp) < dedupeWindow
    );
  }

  /**
   * 开始处理队列
   */
  private startProcessing() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // 延迟开始处理第一个任务，防止快速重复提交
    this.processTimer = setTimeout(() => {
      this.processNext();
    }, 500); // 500ms延迟开始处理第一个任务
  }

  /**
   * 处理下一个任务
   */
  private async processNext() {
    const pendingTask = this.queue.find(task => task.status === 'pending');

    if (!pendingTask) {
      this.isProcessing = false;
      return;
    }

    // 标记为处理中
    pendingTask.status = 'processing';
    this.saveToStorage();
    this.config.onTaskProgress?.(pendingTask);
    this.notifyListeners('progress', pendingTask);

    try {
      // 执行任务
      await pendingTask.executor(pendingTask.data);

      // 任务成功
      pendingTask.status = 'completed';
      this.config.onTaskComplete?.(pendingTask);
      this.notifyListeners('complete', pendingTask);

    } catch (error: any) {
      pendingTask.lastError = error.message || '未知错误';
      pendingTask.retryCount++;

      if (pendingTask.retryCount < pendingTask.maxRetries) {
        // 重试
        pendingTask.status = 'pending';

        // 延迟重试
        this.retryTimer = setTimeout(() => {
          this.processNext();
        }, this.config.retryDelay);
        return;
      } else {
        // 超过重试次数，标记为失败
        pendingTask.status = 'failed';
        this.config.onTaskFailed?.(pendingTask);
        this.notifyListeners('failed', pendingTask);
      }
    }

    this.saveToStorage();

    // 清理已完成的任务（保留最近10个）
    this.cleanupCompletedTasks();

    // 延迟处理下一个任务
    this.processTimer = setTimeout(() => {
      this.processNext();
    }, this.config.processDelay);
  }

  /**
   * 清理已完成的任务
   */
  private cleanupCompletedTasks() {
    const completedTasks = this.queue.filter(task => task.status === 'completed');
    if (completedTasks.length > 10) {
      // 保留最近10个完成的任务
      const toRemove = completedTasks.slice(0, completedTasks.length - 10);
      this.queue = this.queue.filter(task => !toRemove.includes(task));
    }
  }

  /**
   * 添加事件监听器
   */
  addListener(event: 'complete' | 'failed' | 'progress', callback: (task: QueueTask) => void): () => void {
    this.listeners[event].push(callback);
    // 返回取消监听的函数
    return () => {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    };
  }

  /**
   * 通知监听器
   */
  private notifyListeners(event: 'complete' | 'failed' | 'progress', task: QueueTask) {
    this.listeners[event].forEach(callback => {
      try {
        callback(task);
      } catch {
        // ignore listener errors
      }
    });
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存到localStorage
   */
  private saveToStorage() {
    const key = this.config.storageKey;
    if (!key) return;

    const data = {
      queue: this.queue.filter(task => task.status !== 'completed'), // 不保存已完成任务
      timestamp: Date.now()
    };
    writeJSON(key, data);
  }

  /**
   * 从localStorage加载
   */
  private loadFromStorage() {
    const key = this.config.storageKey;
    if (!key) return;

    const payload = readJSON<{ queue: QueueTask[]; timestamp: number } | null>(key, null);
    if (!payload) return;

    // 只恢复未完成的任务，且只恢复最近1小时内的任务
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.queue = payload.queue.filter(task =>
      task.status !== 'completed' && task.timestamp > oneHourAgo
    );
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(t => t.status === 'pending').length,
      processing: this.queue.filter(t => t.status === 'processing').length,
      completed: this.queue.filter(t => t.status === 'completed').length,
      failed: this.queue.filter(t => t.status === 'failed').length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * 清空队列
   */
  clearQueue() {
    this.queue = [];
    this.saveToStorage();

    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.isProcessing = false;
  }

  /**
   * 重试失败的任务
   */
  retryFailedTasks() {
    this.queue
      .filter(task => task.status === 'failed')
      .forEach(task => {
        task.status = 'pending';
        task.retryCount = 0;
        task.lastError = undefined;
      });

    this.saveToStorage();
    this.startProcessing();
  }

  /**
   * 销毁队列
   */
  destroy() {
    this.clearQueue();
    removeItem(this.config.storageKey || 'task-queue');
  }
}

// 导出单例实例
export const taskQueue = new TaskQueue({
  processDelay: 3000,      // 处理间隔增加到3秒
  retryDelay: 5000,        // 重试延迟增加到5秒
  dedupeWindow: 2000,      // 去重时间窗口增加到2秒
  maxRetries: 3,
  storageKey: 'smart-ledger-task-queue'
});
