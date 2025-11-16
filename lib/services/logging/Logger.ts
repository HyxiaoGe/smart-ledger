/**
 * 核心日志服务类
 */

import type {
  LogRecord,
  LogTransport,
  ApiRequestLog,
  ErrorLog,
  UserActionLog,
  PerformanceLog,
} from './types';
import { LogLevel, LogCategory } from './types';
import type { LogConfig } from './config';
import { defaultLogConfig, shouldLog } from './config';

/**
 * Logger 类
 */
export class Logger {
  private config: LogConfig;
  private transports: LogTransport[] = [];

  constructor(config?: Partial<LogConfig>) {
    this.config = { ...defaultLogConfig, ...config };
  }

  /**
   * 添加日志传输器
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /**
   * 记录日志
   */
  private async log(record: LogRecord): Promise<void> {
    // 检查是否启用日志
    if (!this.config.enabled) return;

    // 检查日志级别是否满足配置
    if (!shouldLog(record.level, this.config.level)) return;

    // 检查日志分类是否启用
    if (!this.config.categories[record.category]) return;

    // 控制台输出（开发环境）
    if (this.config.console) {
      this.logToConsole(record);
    }

    // 写入所有传输器（异步，不阻塞）
    for (const transport of this.transports) {
      try {
        await transport.write(record);
      } catch (error) {
        console.error('[Logger] 传输器写入失败:', error);
      }
    }
  }

  /**
   * 控制台输出
   */
  private logToConsole(record: LogRecord): void {
    const prefix = `[${record.level.toUpperCase()}] [${record.category}]`;
    const message = `${prefix} ${record.message}`;

    switch (record.level) {
      case LogLevel.DEBUG:
        console.debug(message, record.metadata || '');
        break;
      case LogLevel.INFO:
        console.info(message, record.metadata || '');
        break;
      case LogLevel.WARN:
        console.warn(message, record.metadata || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, {
          ...record.metadata,
          error_code: record.error_code,
          trace_id: record.trace_id,
        });
        break;
    }
  }

  /**
   * 基础日志方法
   */
  async debug(message: string, data?: Partial<LogRecord>): Promise<void> {
    await this.log({
      level: LogLevel.DEBUG,
      category: data?.category || LogCategory.SYSTEM,
      message,
      ...data,
    });
  }

  async info(message: string, data?: Partial<LogRecord>): Promise<void> {
    await this.log({
      level: LogLevel.INFO,
      category: data?.category || LogCategory.SYSTEM,
      message,
      ...data,
    });
  }

  async warn(message: string, data?: Partial<LogRecord>): Promise<void> {
    await this.log({
      level: LogLevel.WARN,
      category: data?.category || LogCategory.SYSTEM,
      message,
      ...data,
    });
  }

  async error(message: string, data?: Partial<LogRecord>): Promise<void> {
    await this.log({
      level: LogLevel.ERROR,
      category: data?.category || LogCategory.ERROR,
      message,
      ...data,
    });
  }

  async fatal(message: string, data?: Partial<LogRecord>): Promise<void> {
    await this.log({
      level: LogLevel.FATAL,
      category: data?.category || LogCategory.ERROR,
      message,
      ...data,
    });
  }

  /**
   * 记录 API 请求日志
   */
  async logApiRequest(data: ApiRequestLog): Promise<void> {
    await this.log({
      level: data.status_code >= 500 ? LogLevel.ERROR : LogLevel.INFO,
      category: LogCategory.API_REQUEST,
      message: `${data.method} ${data.path} - ${data.status_code}`,
      trace_id: data.trace_id,
      method: data.method,
      path: data.path,
      status_code: data.status_code,
      duration_ms: data.duration_ms,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      metadata: data.metadata,
    });
  }

  /**
   * 记录错误日志
   */
  async logError(data: ErrorLog): Promise<void> {
    const { error, trace_id, method, path, duration_ms, metadata } = data;

    await this.log({
      level: LogLevel.ERROR,
      category: LogCategory.ERROR,
      message: error.message || '未知错误',
      trace_id,
      method,
      path,
      error_code: error.code,
      error_stack: error.stack,
      status_code: error.statusCode,
      duration_ms,
      metadata: {
        ...metadata,
        errorName: error.name,
      },
    });
  }

  /**
   * 记录用户操作日志
   */
  async logUserAction(data: UserActionLog): Promise<void> {
    await this.log({
      level: LogLevel.INFO,
      category: LogCategory.USER_ACTION,
      message: `用户操作: ${data.action}`,
      operation_id: data.operation_id,
      metadata: {
        action: data.action,
        ...data.metadata,
      },
    });
  }

  /**
   * 记录性能日志
   */
  async logPerformance(data: PerformanceLog): Promise<void> {
    await this.log({
      level: LogLevel.INFO,
      category: LogCategory.PERFORMANCE,
      message: `${data.operation} 耗时 ${data.duration_ms}ms`,
      duration_ms: data.duration_ms,
      metadata: {
        operation: data.operation,
        ...data.metadata,
      },
    });
  }

  /**
   * 记录数据同步日志
   */
  async logDataSync(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      level: LogLevel.INFO,
      category: LogCategory.DATA_SYNC,
      message,
      metadata,
    });
  }

  /**
   * 记录安全审计日志
   */
  async logSecurity(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      level: LogLevel.WARN,
      category: LogCategory.SECURITY,
      message,
      metadata: {
        ...metadata,
        sensitive: true,
      },
    });
  }

  /**
   * 性能计时器（便捷方法）
   */
  startTimer(operation: string): PerformanceTimer {
    return new PerformanceTimer(operation, this);
  }
}

/**
 * 性能计时器类
 */
class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private logger: Logger;

  constructor(operation: string, logger: Logger) {
    this.operation = operation;
    this.logger = logger;
    this.startTime = Date.now();
  }

  /**
   * 结束计时并记录日志
   */
  async done(message?: string, metadata?: Record<string, any>): Promise<void> {
    const duration_ms = Date.now() - this.startTime;
    await this.logger.logPerformance({
      operation: message || this.operation,
      duration_ms,
      metadata,
    });
  }
}
