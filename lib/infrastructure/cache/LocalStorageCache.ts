/**
 * LocalStorage 缓存实现
 * 基于浏览器 localStorage 的持久化缓存
 */

import type { ICache, CacheEntry, CacheOptions, CacheStats } from './ICache';

/**
 * LocalStorage 缓存实现
 */
export class LocalStorageCache<T = any> implements ICache<T> {
  private readonly prefix: string;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(prefix: string = 'cache:') {
    this.prefix = prefix;
  }

  /**
   * 获取缓存值
   */
  get(key: string): T | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      this.stats.misses++;
      return null;
    }

    try {
      const item = window.localStorage.getItem(this.getKey(key));

      if (!item) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(item);

      // 检查是否过期
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.value;
    } catch (error) {
      console.error('Failed to get cache from localStorage:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  set(key: string, value: T, options?: CacheOptions): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
        tags: options?.tags
      };

      window.localStorage.setItem(this.getKey(key), JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to set cache to localStorage:', error);
    }
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    window.localStorage.removeItem(this.getKey(key));
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const keys = this.keys();
    keys.forEach((key) => {
      window.localStorage.removeItem(this.getKey(key));
    });

    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * 根据标签失效缓存
   */
  invalidateByTag(tag: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const keys = this.keys();

    keys.forEach((key) => {
      try {
        const item = window.localStorage.getItem(this.getKey(key));
        if (item) {
          const entry: CacheEntry<T> = JSON.parse(item);
          if (entry.tags?.includes(tag)) {
            this.delete(key);
          }
        }
      } catch (error) {
        console.error('Failed to invalidate cache by tag:', error);
      }
    });
  }

  /**
   * 根据前缀失效缓存
   */
  invalidateByPrefix(prefix: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const keys = this.keys();

    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    });
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    const keys: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }

    return keys;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      size: this.keys().length
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const now = Date.now();
    const keys = this.keys();

    keys.forEach((key) => {
      try {
        const item = window.localStorage.getItem(this.getKey(key));
        if (item) {
          const entry: CacheEntry<T> = JSON.parse(item);
          if (entry.expiresAt && now > entry.expiresAt) {
            this.delete(key);
          }
        }
      } catch (error) {
        console.error('Failed to cleanup cache:', error);
      }
    });
  }

  /**
   * 获取完整的缓存键
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }
}
