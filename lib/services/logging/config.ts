/**
 * 日志系统配置
 */

import { LogLevel, LogCategory } from './types';

/**
 * 日志配置接口
 */
export interface LogConfig {
  // 是否启用日志
  enabled: boolean;

  // 日志级别（只记录该级别及以上的日志）
  level: LogLevel;

  // 日志类型开关
  categories: {
    [LogCategory.API_REQUEST]: boolean;
    [LogCategory.USER_ACTION]: boolean;
    [LogCategory.SYSTEM]: boolean;
    [LogCategory.ERROR]: boolean;
    [LogCategory.PERFORMANCE]: boolean;
    [LogCategory.SECURITY]: boolean;
    [LogCategory.DATA_SYNC]: boolean;
  };

  // 批量写入配置
  batch: {
    enabled: boolean;
    size: number;      // 批量大小
    interval: number;  // 批量间隔（毫秒）
  };

  // 是否同时输出到控制台
  console: boolean;
}

/**
 * 默认日志配置
 */
export const defaultLogConfig: LogConfig = {
  enabled: process.env.LOG_ENABLED !== 'false',
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,

  categories: {
    [LogCategory.API_REQUEST]: process.env.LOG_API_REQUEST !== 'false',
    [LogCategory.USER_ACTION]: process.env.LOG_USER_ACTION !== 'false',
    [LogCategory.SYSTEM]: process.env.LOG_SYSTEM !== 'false',
    [LogCategory.ERROR]: true, // 错误日志总是开启
    [LogCategory.PERFORMANCE]: process.env.LOG_PERFORMANCE === 'true',
    [LogCategory.SECURITY]: process.env.LOG_SECURITY !== 'false',
    [LogCategory.DATA_SYNC]: process.env.LOG_DATA_SYNC === 'true',
  },

  batch: {
    enabled: process.env.LOG_BATCH_ENABLED !== 'false',
    size: parseInt(process.env.LOG_BATCH_SIZE || '10', 10),
    interval: parseInt(process.env.LOG_BATCH_INTERVAL || '5000', 10),
  },

  console: process.env.NODE_ENV === 'development',
};

/**
 * 日志级别优先级映射
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4,
};

/**
 * 检查日志级别是否应该记录
 */
export function shouldLog(level: LogLevel, configLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configLevel];
}
