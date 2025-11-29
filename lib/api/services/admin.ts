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
   */
  async getCronData(): Promise<CronDataResponse> {
    const response = await apiClient.get<ApiResponse<CronDataResponse>>('/api/admin/cron');
    if (!response.success) {
      throw new Error(response.error || '获取数据失败');
    }
    return response.data || { jobs: [], stats: [], history: [] };
  },

  /**
   * 获取 Cron 任务执行历史
   */
  async getCronHistory(jobId: number, limit: number = 50): Promise<CronJobRun[]> {
    const query = buildQueryString({ type: 'history', job_id: jobId.toString(), limit: limit.toString() });
    const response = await apiClient.get<ApiResponse<CronJobRun[]>>(`/api/admin/cron${query}`);
    if (!response.success) {
      throw new Error(response.error || '获取执行历史失败');
    }
    return response.data || [];
  },

  /**
   * 手动触发 Cron 任务
   */
  async triggerCronJob(jobName: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.post<ApiResponse<unknown>>('/api/admin/cron/trigger', { jobName });
    return { success: response.success, error: response.error };
  },

  /**
   * 获取日志列表
   */
  async getLogs(params: LogListParams): Promise<LogListResponse> {
    const query = buildQueryString(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
      )
    );
    const response = await apiClient.get<ApiResponse<LogRecord[]> & { pagination: LogListResponse['pagination'] }>(
      `/api/admin/logs${query}`
    );
    if (!response.success) {
      throw new Error(response.error || '加载日志失败');
    }
    return {
      data: response.data || [],
      pagination: response.pagination || { page: 1, page_size: 10, total: 0, total_pages: 0 },
    };
  },

  /**
   * 获取日志统计
   */
  async getLogStats(): Promise<LogStats> {
    const response = await apiClient.get<ApiResponse<LogStats>>('/api/admin/logs/stats');
    if (!response.success) {
      throw new Error(response.error || '获取统计信息失败');
    }
    return response.data!;
  },
};
