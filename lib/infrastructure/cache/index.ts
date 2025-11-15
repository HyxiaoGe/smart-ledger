/**
 * 缓存系统统一导出
 */

// 导出接口
export type { ICache, IAsyncCache, CacheEntry, CacheOptions, CacheStats } from './ICache';

// 导出实现
export { MemoryCache } from './MemoryCache';
export { LocalStorageCache } from './LocalStorageCache';

// 导出装饰器
export { CacheDecorator, withCache, withCacheSync } from './CacheDecorator';
export type { CacheDecoratorConfig } from './CacheDecorator';

// 导出默认缓存实例
import { MemoryCache } from './MemoryCache';
import { LocalStorageCache } from './LocalStorageCache';

/**
 * 默认内存缓存实例
 */
export const memoryCache = new MemoryCache();

/**
 * 默认 LocalStorage 缓存实例
 */
export const localStorageCache = new LocalStorageCache('smart-ledger:cache:');

/**
 * 缓存工厂
 * 根据环境自动选择合适的缓存实现
 */
export function createCache<T = any>(type: 'memory' | 'localStorage' = 'memory') {
  switch (type) {
    case 'memory':
      return new MemoryCache<T>();
    case 'localStorage':
      return new LocalStorageCache<T>('smart-ledger:cache:');
    default:
      return new MemoryCache<T>();
  }
}

/**
 * 获取默认缓存
 * 在浏览器环境使用 localStorage，在服务端使用内存缓存
 */
export function getDefaultCache<T = any>() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorageCache as any as MemoryCache<T>;
  }
  return memoryCache as MemoryCache<T>;
}
