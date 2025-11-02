/**
 * 统一缓存服务
 * 替换项目中的多个缓存系统，提供一致的缓存接口
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheOptions {
  /**
   * 缓存过期时间（毫秒）
   * 默认 5 分钟
   */
  ttl?: number;

  /**
   * 缓存键前缀
   */
  prefix?: string;

  /**
   * 是否启用控制台日志
   */
  debug?: boolean;
}

export class UnifiedCacheService {
  private static instance: UnifiedCacheService;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 分钟
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    // 每分钟清理一次过期缓存
    this.startCleanupInterval();
  }

  static getInstance(): UnifiedCacheService {
    if (!UnifiedCacheService.instance) {
      UnifiedCacheService.instance = new UnifiedCacheService();
    }
    return UnifiedCacheService.instance;
  }

  /**
   * 获取缓存数据
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.prefix);
    const cached = this.memoryCache.get(fullKey);

    if (!cached) {
      this.log('MISS', fullKey, options?.debug);
      return null;
    }

    // 检查是否过期
    if (this.isExpired(cached)) {
      this.memoryCache.delete(fullKey);
      this.log('EXPIRED', fullKey, options?.debug);
      return null;
    }

    this.log('HIT', fullKey, options?.debug);
    return cached.data as T;
  }

  /**
   * 设置缓存数据
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.prefix);
    const ttl = options?.ttl || this.DEFAULT_TTL;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key: fullKey
    };

    this.memoryCache.set(fullKey, entry);
    this.log('SET', fullKey, options?.debug, `TTL: ${ttl}ms`);
  }

  /**
   * 删除缓存
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.prefix);
    const deleted = this.memoryCache.delete(fullKey);

    if (deleted) {
      this.log('DELETE', fullKey, options?.debug);
    }

    return deleted;
  }

  /**
   * 清除所有缓存
   */
  async clear(prefix?: string): Promise<void> {
    if (prefix) {
      // 清除指定前缀的缓存
      const keysToDelete: string[] = [];
      this.memoryCache.forEach((_, key) => {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.memoryCache.delete(key));
      this.log('CLEAR', `prefix:${prefix}`, true, `Cleared ${keysToDelete.length} entries`);
    } else {
      // 清除所有缓存
      const count = this.memoryCache.size;
      this.memoryCache.clear();
      this.log('CLEAR', 'all', true, `Cleared ${count} entries`);
    }
  }

  /**
   * 获取或设置缓存（如果缓存不存在则执行 fetcher）
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, options);

    if (cached !== null) {
      return cached;
    }

    // 缓存不存在，执行 fetcher
    const data = await fetcher();
    await this.set(key, data, options);

    return data;
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();

    this.memoryCache.forEach(entry => {
      totalSize++;
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
    });

    return {
      totalEntries: totalSize,
      expiredEntries: expiredCount,
      activeEntries: totalSize - expiredCount
    };
  }

  /**
   * 手动清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.memoryCache.delete(key));

    if (keysToDelete.length > 0) {
      this.log('CLEANUP', 'auto', true, `Removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * 构建完整的缓存键
   */
  private buildKey(key: string, prefix?: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }

  /**
   * 日志输出
   */
  private log(operation: string, key: string, debug?: boolean, extra?: string): void {
    if (!debug) return;

    const message = `[Cache ${operation}] ${key}`;
    console.log(extra ? `${message} - ${extra}` : message);
  }

  /**
   * 启动定期清理
   */
  private startCleanupInterval(): void {
    if (typeof window === 'undefined') return;

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 每分钟执行一次
  }

  /**
   * 停止定期清理
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * 导出单例实例
 */
export const unifiedCache = UnifiedCacheService.getInstance();

/**
 * 便捷函数：为特定功能创建缓存实例
 */
export function createCacheHelper(prefix: string, ttl?: number) {
  return {
    get: <T>(key: string) => unifiedCache.get<T>(key, { prefix, ttl }),
    set: <T>(key: string, data: T) => unifiedCache.set(key, data, { prefix, ttl }),
    delete: (key: string) => unifiedCache.delete(key, { prefix }),
    getOrSet: <T>(key: string, fetcher: () => Promise<T>) =>
      unifiedCache.getOrSet(key, fetcher, { prefix, ttl }),
    clear: () => unifiedCache.clear(prefix)
  };
}

/**
 * 预定义的缓存实例
 */
export const aiPredictionCache = createCacheHelper('ai-prediction', 5 * 60 * 1000);
export const smartSuggestionsCache = createCacheHelper('smart-suggestions', 3 * 60 * 1000);
export const transactionsCache = createCacheHelper('transactions', 1 * 60 * 1000);
