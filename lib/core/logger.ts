/**
 * 统一的日志系统入口
 * 自动根据环境选择正确的实现
 */

// 使用动态导入在运行时决定使用哪个实现
const isBrowser = typeof window !== 'undefined';

// 导出的类型
export type Logger = {
  fatal: (obj?: any, msg?: string) => void;
  error: (obj?: any, msg?: string) => void;
  warn: (obj?: any, msg?: string) => void;
  info: (obj?: any, msg?: string) => void;
  debug: (obj?: any, msg?: string) => void;
  trace: (obj?: any, msg?: string) => void;
  child: (bindings: any) => Logger;
};

let loggerModule: {
  logger: Logger;
  createModuleLogger: (module: string) => Logger;
  createRequestLogger: (api: string, req?: Request) => Logger;
  startPerformanceMeasure: () => () => { duration: number };
};

if (isBrowser) {
  // 浏览器环境：使用客户端实现
  loggerModule = require('./logger.client');
} else {
  // 服务端环境：使用服务端实现
  loggerModule = require('./logger.server');
}

export const logger = loggerModule.logger;
export const createModuleLogger = loggerModule.createModuleLogger;
export const createRequestLogger = loggerModule.createRequestLogger;
export const startPerformanceMeasure = loggerModule.startPerformanceMeasure;
