/**
 * 服务端日志系统
 * 仅在服务端使用
 */

import pino from 'pino';

// 确保 stdout 使用 UTF-8 编码
if (process.stdout?.setDefaultEncoding) {
  process.stdout.setDefaultEncoding('utf8');
}

const isDev = process.env?.NODE_ENV === 'development';

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    base: { env: process.env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  },
  pino.destination({ dest: 1, sync: false })
);

export function createModuleLogger(module: string) {
  return logger.child({ module });
}

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

export function startPerformanceMeasure() {
  const startTime = Date.now();
  return () => ({ duration: Date.now() - startTime });
}
