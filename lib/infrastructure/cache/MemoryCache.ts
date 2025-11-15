/**
 * 内存缓存实现
 * 基于 Map 实现的高性能内存缓存
 */

import type { ICache, CacheEntry, CacheOptions, CacheStats } from './ICache';

/**
 * 内存缓存实现
 */
export class MemoryCache<T = any> implements ICache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private tagIndex = new Map<string, Set<string>>();
  private stats = {
    hits: 0,
    misses: 0
  };

  /**
   * 获取缓存值
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(key: string, value: T, options?: CacheOptions): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
      tags: options?.tags
    };

    this.cache.set(key, entry);

    // 更新标签索引
    if (options?.tags) {
      options.tags.forEach((tag) => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      });
    }
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    const entry = this.cache.get(key);

    if (entry?.tags) {
      // 从标签索引中移除
      entry.tags.forEach((tag) => {
        this.tagIndex.get(tag)?.delete(key);
      });
    }

    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * 根据标签失效缓存
   */
  invalidateByTag(tag: string): void {
    const keys = this.tagIndex.get(tag);

    if (keys) {
      keys.forEach((key) => {
        this.cache.delete(key);
      });
      this.tagIndex.delete(tag);
    }
  }

  /**
   * 根据前缀失效缓存
   */
  invalidateByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.delete(key));
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
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
      size: this.cache.size
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.expiresAt && now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.delete(key));
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }
}
