/**
 * 统一的日志系统
 *
 * 基于 Pino 构建，提供结构化的日志输出
 * - 开发环境：彩色控制台输出（pino-pretty）
 * - 生产环境：JSON 格式输出（方便日志收集系统处理）
 *
 * 使用示例：
 * ```ts
 * import { logger } from '@/lib/core/logger';
 *
 * logger.info({ userId: '123', action: 'login' }, 'User logged in');
 * logger.error({ error: err.message }, 'Failed to process request');
 *
 * // 创建模块专用 logger
 * const apiLogger = createModuleLogger('api');
 * apiLogger.debug({ endpoint: '/api/analyze' }, 'Request started');
 * ```
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

/**
 * 主日志实例
 */
export const logger = pino({
  // 日志级别
  // 可通过环境变量 LOG_LEVEL 覆盖，如：LOG_LEVEL=debug npm run dev
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

  // 开发环境：使用 pino-pretty 美化输出
  // 生产环境：原始 JSON 输出（利于 Docker/Vercel/K8s 收集）
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '{module} {msg}',
          singleLine: false,
        },
      }
    : undefined,

  // 基础字段（所有日志都包含）
  base: {
    env: process.env.NODE_ENV,
    // 生产环境可以添加更多元信息
    // app: 'smart-ledger',
    // version: process.env.npm_package_version,
  },

  // 时间戳格式（ISO 8601）
  timestamp: pino.stdTimeFunctions.isoTime,

  // 序列化器（处理特殊对象）
  serializers: {
    // 错误对象序列化
    error: pino.stdSerializers.err,
    // 请求对象序列化
    req: pino.stdSerializers.req,
    // 响应对象序列化
    res: pino.stdSerializers.res,
  },
});

/**
 * 创建模块专用的 logger
 *
 * 用于区分不同模块/服务的日志，便于过滤和分析
 *
 * @param module 模块名称，如 'api', 'ai-client', 'cron-service'
 * @returns 带有模块标识的子 logger
 *
 * @example
 * ```ts
 * const aiLogger = createModuleLogger('ai-client');
 * aiLogger.info({ tokens: 1200 }, 'AI request completed');
 * // 输出: {"level":30,"module":"ai-client","tokens":1200,"msg":"AI request completed"}
 * ```
 */
export function createModuleLogger(module: string) {
  return logger.child({ module });
}

/**
 * 创建 API 请求专用的 logger
 *
 * 自动生成 requestId，用于追踪单次请求的完整生命周期
 *
 * @param api API 路径，如 '/api/analyze'
 * @param req 可选的 Request 对象
 * @returns 带有请求上下文的 logger
 *
 * @example
 * ```ts
 * export async function POST(req: Request) {
 *   const log = createRequestLogger('/api/analyze', req);
 *   log.info('Request started');
 *   // ... 业务逻辑
 *   log.info({ duration: 123 }, 'Request completed');
 * }
 * ```
 */
export function createRequestLogger(api: string, req?: Request) {
  const requestId = crypto.randomUUID();
  const method = req?.method;

  return logger.child({
    module: 'api',
    requestId,
    api,
    ...(method && { method }),
  });
}

/**
 * 记录性能指标
 *
 * 用于追踪关键操作的耗时
 *
 * @example
 * ```ts
 * const measure = startPerformanceMeasure();
 * await doSomething();
 * logger.info({ ...measure(), operation: 'doSomething' }, 'Operation completed');
 * // 输出: {"level":30,"operation":"doSomething","duration":123,"msg":"Operation completed"}
 * ```
 */
export function startPerformanceMeasure() {
  const startTime = Date.now();

  return () => ({
    duration: Date.now() - startTime,
  });
}

/**
 * 日志级别说明
 *
 * - fatal (60): 致命错误，应用即将崩溃
 * - error (50): 错误，但应用可以继续运行
 * - warn (40):  警告，需要注意但不影响功能
 * - info (30):  关键信息（默认生产环境级别）
 * - debug (20): 调试信息（默认开发环境级别）
 * - trace (10): 详细追踪信息
 *
 * 使用建议：
 * - 用户操作、API 调用 → info
 * - 预期内的错误（如参数校验失败）→ warn
 * - 未预期的错误（如数据库连接失败）→ error
 * - 系统崩溃 → fatal
 * - 开发调试 → debug/trace
 */
