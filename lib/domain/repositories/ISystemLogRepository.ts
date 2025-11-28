/**
 * 系统日志仓储接口
 * 定义所有系统日志数据访问的标准接口
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogCategory =
  | 'api_request'
  | 'user_action'
  | 'system'
  | 'error'
  | 'performance'
  | 'security'
  | 'data_sync';

export interface SystemLog {
  id: string;
  created_at: string;
  level: LogLevel;
  category: LogCategory;
  trace_id: string | null;
  session_id: string | null;
  operation_id: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  ip_address: string | null;
  user_agent: string | null;
  message: string;
  error_code: string | null;
  error_stack: string | null;
  metadata: Record<string, any> | null;
  duration_ms: number | null;
}

export interface CreateSystemLogDTO {
  level: LogLevel;
  category: LogCategory;
  message: string;
  trace_id?: string;
  session_id?: string;
  operation_id?: string;
  method?: string;
  path?: string;
  status_code?: number;
  ip_address?: string;
  user_agent?: string;
  error_code?: string;
  error_stack?: string;
  metadata?: Record<string, any>;
  duration_ms?: number;
}

export interface SystemLogFilter {
  level?: LogLevel;
  category?: LogCategory;
  trace_id?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface SystemLogPagination {
  page: number;
  pageSize: number;
  sortBy?: 'created_at' | 'level' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedLogs {
  data: SystemLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<LogCategory, number>;
  recentErrors: SystemLog[];
}

/**
 * 系统日志仓储接口
 */
export interface ISystemLogRepository {
  /**
   * 创建日志
   */
  create(data: CreateSystemLogDTO): Promise<SystemLog>;

  /**
   * 批量创建日志
   */
  createMany(data: CreateSystemLogDTO[]): Promise<void>;

  /**
   * 查询日志（带分页）
   */
  findMany(
    filter?: SystemLogFilter,
    pagination?: SystemLogPagination
  ): Promise<PaginatedLogs>;

  /**
   * 根据 trace_id 查找相关日志
   */
  findByTraceId(traceId: string): Promise<SystemLog[]>;

  /**
   * 获取日志统计
   */
  getStats(dateRange?: { start: string; end: string }): Promise<LogStats>;

  /**
   * 清理过期日志
   */
  cleanupOldLogs(retentionDays: number): Promise<number>;
}
