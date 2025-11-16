/**
 * 日志系统类型定义
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * 日志分类
 */
export enum LogCategory {
  API_REQUEST = 'api_request',    // API 请求日志
  USER_ACTION = 'user_action',    // 用户操作审计
  SYSTEM = 'system',              // 系统日志
  ERROR = 'error',                // 错误日志
  PERFORMANCE = 'performance',    // 性能日志
  SECURITY = 'security',          // 安全日志
  DATA_SYNC = 'data_sync',        // 数据同步日志
}

/**
 * 日志记录接口
 */
export interface LogRecord {
  // 日志分类
  level: LogLevel;
  category: LogCategory;
  message: string;

  // 追踪信息
  trace_id?: string;
  session_id?: string;
  operation_id?: string;

  // 请求信息（用于 API 日志）
  method?: string;
  path?: string;
  status_code?: number;
  ip_address?: string;
  user_agent?: string;

  // 错误信息
  error_code?: string;
  error_stack?: string;

  // 元数据（任意 JSON 数据）
  metadata?: Record<string, any>;

  // 性能指标
  duration_ms?: number;
}

/**
 * API 请求日志参数
 */
export interface ApiRequestLog {
  trace_id: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

/**
 * 错误日志参数
 */
export interface ErrorLog {
  trace_id: string;
  method?: string;
  path?: string;
  error: Error & { code?: string; statusCode?: number };
  duration_ms?: number;
  metadata?: Record<string, any>;
}

/**
 * 用户操作日志参数
 */
export interface UserActionLog {
  action: string;
  operation_id?: string;
  metadata?: Record<string, any>;
}

/**
 * 性能日志参数
 */
export interface PerformanceLog {
  operation: string;
  duration_ms: number;
  metadata?: Record<string, any>;
}

/**
 * 日志传输接口
 */
export interface LogTransport {
  write(record: LogRecord): Promise<void>;
  flush?(): Promise<void>;
}
