/**
 * 浏览器端日志系统
 * 提供空实现以避免错误
 */

const noop = () => {};

const createBrowserLogger = () => ({
  fatal: noop,
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,
  trace: noop,
  child: () => createBrowserLogger(),
});

export const logger = createBrowserLogger();

export function createModuleLogger(_module: string) {
  return logger;
}

export function createRequestLogger(_api: string, _req?: Request) {
  return logger;
}

export function startPerformanceMeasure() {
  return () => ({ duration: 0 });
}
