/**
 * 日志系统统一导出
 * 简化版本 - 仅使用控制台输出
 */

import { Logger } from './Logger';

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
    // 日志直接输出到控制台，不再写入数据库
    // 如需数据库日志，可以创建 PrismaTransport 并添加
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
