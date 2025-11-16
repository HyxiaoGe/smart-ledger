/**
 * 日志系统统一导出
 */

import { Logger } from './Logger';
import { getSupabaseTransport } from './SupabaseTransport';
import { defaultLogConfig } from './config';

/**
 * 全局单例 logger 实例
 */
let loggerInstance: Logger | null = null;

/**
 * 获取全局 logger 实例
 */
export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();

    // 添加 Supabase 传输器
    const transport = getSupabaseTransport({
      batchEnabled: defaultLogConfig.batch.enabled,
      batchSize: defaultLogConfig.batch.size,
      batchInterval: defaultLogConfig.batch.interval,
    });

    loggerInstance.addTransport(transport);
  }

  return loggerInstance;
}

/**
 * 默认导出全局 logger 实例
 */
export const logger = getLogger();

/**
 * 导出类型和配置
 */
export * from './types';
export * from './config';
export { Logger } from './Logger';
