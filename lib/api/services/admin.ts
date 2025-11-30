/**
 * Admin API 服务 - 管理定时任务和日志
 */

import { apiClient, buildQueryString } from '../client';
import type { CronJob, CronJobRun, CronJobStats } from '@/lib/services/cronService';

/**
 * Cron 数据响应
 */
export interface CronDataResponse {
  jobs: CronJob[];
  stats: CronJobStats[];
  history: CronJobRun[];
}

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志类别
 */
export type LogCategory = 'api_request' | 'user_action' | 'system' | 'error' | 'performance' | 'security' | 'data_sync';

/**
 * 日志记录
 */
export interface LogRecord {
  id: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  trace_id?: string;
  method?: string;
  path?: string;
  status_code?: number;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * 日志统计
 */
export interface LogStats {
  overview: {
    total_logs: number;
    error_logs: number;
    recent_24h: number;
    recent_1h: number;
  };
  level_stats: Array<{ level: string; count: number }>;
  category_stats: Array<{ category: string; count: number }>;
  api_stats: {
    total_requests: number;
    success_requests: number;
    client_errors: number;
    server_errors: number;
    success_rate: number;
    avg_response_time: number;
  };
  recent_errors: LogRecord[];
}

/**
 * 日志列表查询参数
 */
export interface LogListParams {
  page?: number;
  page_size?: number;
  level?: LogLevel | '';
  category?: LogCategory | '';
  search?: string;
}

/**
 * 日志列表响应
 */
export interface LogListResponse {
  data: LogRecord[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

/**
 * API 响应包装器
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Admin API 服务
 */
export const adminApi = {
  /**
   * 获取 Cron 任务数据
   * 注意：apiClient 已经解包了 data 字段，直接返回即可
   */
  async getCronData(): Promise<CronDataResponse> {
    const response = await apiClient.get<CronDataResponse>('/api/admin/cron');
    return response || { jobs: [], stats: [], history: [] };
  },

  /**
   * 获取 Cron 任务执行历史
   */
  async getCronHistory(jobId: number, limit: number = 50): Promise<CronJobRun[]> {
    const query = buildQueryString({ type: 'history', job_id: jobId.toString(), limit: limit.toString() });
    const response = await apiClient.get<CronJobRun[]>(`/api/admin/cron${query}`);
    return response || [];
  },

  /**
   * 手动触发 Cron 任务
   */
  async triggerCronJob(jobName: string): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.post('/api/admin/cron/trigger', { jobName });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '任务执行失败' };
    }
  },

  /**
   * 获取日志列表
   * 注意：由于 apiClient 会自动解包 data 字段，这里需要直接使用 fetch
   */
  async getLogs(params: LogListParams): Promise<LogListResponse> {
    const query = buildQueryString(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
      )
    );

    // 直接使用 fetch，避免 apiClient 自动解包 data
    const response = await fetch(`/api/admin/logs${query}`);
    const json = await response.json();

    if (!json.success) {
      throw new Error(json.error || '加载日志失败');
    }
    return {
      data: json.data || [],
      pagination: json.pagination || { page: 1, page_size: 10, total: 0, total_pages: 0 },
    };
  },

  /**
   * 获取日志统计
   * 注意：由于 apiClient 会自动解包 data 字段，这里需要直接使用 fetch
   */
  async getLogStats(): Promise<LogStats> {
    const response = await fetch('/api/admin/logs/stats');
    const json = await response.json();

    if (!json.success) {
      throw new Error(json.error || '获取统计信息失败');
    }
    return json.data;
  },
};
