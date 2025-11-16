/**
 * Supabase 日志传输器
 * 负责将日志写入 Supabase system_logs 表
 */

import { createClient } from '@supabase/supabase-js';
import type { LogRecord, LogTransport } from './types';

/**
 * 创建日志专用的 Supabase 客户端
 * 优先使用 service role key，如果没有则使用 anon key
 */
function createLoggerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for logging');
  }

  // 优先使用 service role key（可以绕过 RLS）
  // 否则使用 anon key（需要 RLS 策略允许）
  const key = serviceKey || anonKey;

  if (!key) {
    throw new Error('Either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input: RequestInfo, init?: RequestInit) =>
        fetch(input, {
          ...(init || {}),
          cache: 'no-store',
        }),
    },
  });
}

/**
 * Supabase 日志传输器
 */
export class SupabaseTransport implements LogTransport {
  private batchEnabled: boolean;
  private batchSize: number;
  private batchInterval: number;
  private buffer: LogRecord[] = [];
  private timer?: NodeJS.Timeout;

  constructor(options?: {
    batchEnabled?: boolean;
    batchSize?: number;
    batchInterval?: number;
  }) {
    this.batchEnabled = options?.batchEnabled ?? true;
    this.batchSize = options?.batchSize ?? 10;
    this.batchInterval = options?.batchInterval ?? 5000;

    // 如果启用批量写入，启动定时器
    if (this.batchEnabled && typeof setInterval !== 'undefined') {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.batchInterval);
    }
  }

  /**
   * 写入单条日志
   */
  async write(record: LogRecord): Promise<void> {
    if (this.batchEnabled) {
      // 批量模式：添加到缓冲区
      this.buffer.push(record);

      // 如果缓冲区已满，立即写入
      if (this.buffer.length >= this.batchSize) {
        await this.flush();
      }
    } else {
      // 非批量模式：立即写入
      await this.writeToSupabase([record]);
    }
  }

  /**
   * 刷新缓冲区（批量写入）
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const recordsToWrite = [...this.buffer];
    this.buffer = [];

    await this.writeToSupabase(recordsToWrite);
  }

  /**
   * 实际写入 Supabase
   */
  private async writeToSupabase(records: LogRecord[]): Promise<void> {
    try {
      const client = createLoggerClient();
      const { error } = await client
        .from('system_logs')
        .insert(records);

      if (error) {
        // 日志写入失败时，只打印到控制台，避免递归
        console.error('[SupabaseTransport] 日志写入失败:', error.message);
      }
    } catch (error) {
      console.error('[SupabaseTransport] 日志写入异常:', error);
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    // 清空缓冲区前，尝试最后一次写入
    if (this.buffer.length > 0) {
      void this.flush();
    }
  }
}

/**
 * 全局单例
 */
let transportInstance: SupabaseTransport | null = null;

export function getSupabaseTransport(options?: {
  batchEnabled?: boolean;
  batchSize?: number;
  batchInterval?: number;
}): SupabaseTransport {
  if (!transportInstance) {
    transportInstance = new SupabaseTransport(options);
  }
  return transportInstance;
}
