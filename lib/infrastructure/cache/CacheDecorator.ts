/**
 * 缓存装饰器
 * 提供透明的缓存能力，支持同步和异步函数
 */

import type { ICache, CacheOptions } from './ICache';

/**
 * 缓存装饰器配置
 */
export interface CacheDecoratorConfig extends CacheOptions {
  /**
   * 是否启用缓存
   */
  enabled?: boolean;

  /**
   * 缓存键生成函数
   */
  keyGenerator?: (...args: any[]) => string;

  /**
   * 是否记录日志
   */
  debug?: boolean;
}

/**
 * 缓存装饰器
 * 包装函数调用，自动处理缓存逻辑
 */
export class CacheDecorator {
  constructor(
    private readonly cache: ICache,
    private readonly config: CacheDecoratorConfig = {}
  ) {
    if (this.config.enabled === undefined) {
      this.config.enabled = true;
    }
  }

  /**
   * 包装异步函数，添加缓存功能
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheDecoratorConfig
  ): Promise<T> {
    const mergedOptions = { ...this.config, ...options };

    // 如果缓存未启用，直接执行函数
    if (!mergedOptions.enabled) {
      return fn();
    }

    // 尝试从缓存获取
    const cached = this.cache.get(key);
    if (cached !== null) {
      this.log('Cache hit:', key);
      return cached as T;
    }

    this.log('Cache miss:', key);

    // 执行函数并缓存结果
    const result = await fn();

    // 存储到缓存
    if (result !== null || mergedOptions.allowNull) {
      this.cache.set(key, result, {
        ttl: mergedOptions.ttl,
        tags: mergedOptions.tags,
        allowNull: mergedOptions.allowNull
      });
    }

    return result;
  }

  /**
   * 包装同步函数，添加缓存功能
   */
  wrapSync<T>(key: string, fn: () => T, options?: CacheDecoratorConfig): T {
    const mergedOptions = { ...this.config, ...options };

    // 如果缓存未启用，直接执行函数
    if (!mergedOptions.enabled) {
      return fn();
    }

    // 尝试从缓存获取
    const cached = this.cache.get(key);
    if (cached !== null) {
      this.log('Cache hit:', key);
      return cached as T;
    }

    this.log('Cache miss:', key);

    // 执行函数并缓存结果
    const result = fn();

    // 存储到缓存
    if (result !== null || mergedOptions.allowNull) {
      this.cache.set(key, result, {
        ttl: mergedOptions.ttl,
        tags: mergedOptions.tags,
        allowNull: mergedOptions.allowNull
      });
    }

    return result;
  }

  /**
   * 方法装饰器：为类方法添加缓存
   */
  static method(options?: CacheDecoratorConfig) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cache = (this as any).cache as ICache;

        if (!cache) {
          console.warn(
            `No cache found in ${target.constructor.name}, executing without cache`
          );
          return originalMethod.apply(this, args);
        }

        // 生成缓存键
        const key = options?.keyGenerator
          ? options.keyGenerator(...args)
          : `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

        // 使用装饰器包装
        const decorator = new CacheDecorator(cache, options);
        return decorator.wrap(key, () => originalMethod.apply(this, args), options);
      };

      return descriptor;
    };
  }

  /**
   * 失效缓存
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.log('Cache invalidated:', key);
  }

  /**
   * 根据标签失效缓存
   */
  invalidateByTag(tag: string): void {
    this.cache.invalidateByTag(tag);
    this.log('Cache invalidated by tag:', tag);
  }

  /**
   * 根据前缀失效缓存
   */
  invalidateByPrefix(prefix: string): void {
    this.cache.invalidateByPrefix(prefix);
    this.log('Cache invalidated by prefix:', prefix);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.log('All cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * 打印日志
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[CacheDecorator]', ...args);
    }
  }
}

/**
 * 创建带缓存的函数
 * 便捷函数，用于快速创建带缓存的异步函数
 */
export function withCache<T>(
  cache: ICache,
  key: string,
  fn: () => Promise<T>,
  options?: CacheDecoratorConfig
): Promise<T> {
  const decorator = new CacheDecorator(cache, options);
  return decorator.wrap(key, fn, options);
}

/**
 * 创建带缓存的同步函数
 */
export function withCacheSync<T>(
  cache: ICache,
  key: string,
  fn: () => T,
  options?: CacheDecoratorConfig
): T {
  const decorator = new CacheDecorator(cache, options);
  return decorator.wrapSync(key, fn, options);
}
