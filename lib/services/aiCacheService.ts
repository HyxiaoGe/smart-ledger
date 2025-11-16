/**
 * AI 缓存服务 - 兼容层
 *
 * @deprecated 此文件已被重构，请使用统一的缓存系统：
 * - `@/lib/infrastructure/cache` - 统一缓存接口
 * - `@/lib/services/ai/AIFeedbackService` - AI 反馈服务
 *
 * 此文件保留仅为向后兼容，内部已迁移到新的缓存系统。
 */

import { memoryCache } from '@/lib/infrastructure/cache';

/**
 * @deprecated 使用 memoryCache 替代
 */
class AICacheService {
  private static instance: AICacheService;

  static getInstance(): AICacheService {
    if (!AICacheService.instance) {
      AICacheService.instance = new AICacheService();
    }
    return AICacheService.instance;
  }

  /**
   * 获取缓存数据
   * @deprecated 使用 memoryCache.get() 替代
   */
  async get<T>(type: string, key: string): Promise<T | null> {
    const cacheKey = `${type}_${key}`;
    return memoryCache.get(cacheKey) as T | null;
  }

  /**
   * 设置缓存数据
   * @deprecated 使用 memoryCache.set() 替代
   */
  async set<T>(type: string, data: T, key: string, ttl?: number): Promise<void> {
    const cacheKey = `${type}_${key}`;
    memoryCache.set(cacheKey, data, {
      ttl: ttl || 30 * 60 * 1000,
      tags: ['ai-cache']
    });
  }

  /**
   * 智能获取数据
   * @deprecated 使用 memoryCache.get() 或 CacheDecorator.wrap() 替代
   */
  async smartGet<T>(
    type: string,
    params: Record<string, any> = {},
    fetchFn: () => Promise<T>,
    options: {
      forceRefresh?: boolean;
      customTtl?: number;
    } = {}
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(type, params);

    if (options.forceRefresh) {
      const data = await fetchFn();
      memoryCache.set(cacheKey, data, {
        ttl: options.customTtl || 30 * 60 * 1000,
        tags: ['ai-cache']
      });
      return data;
    }

    const cached = memoryCache.get(cacheKey);
    if (cached) {
      return cached as T;
    }

    const data = await fetchFn();
    memoryCache.set(cacheKey, data, {
      ttl: options.customTtl || 30 * 60 * 1000,
      tags: ['ai-cache']
    });
    return data;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join('|');
    return `ai_cache_${type}_${sortedParams}`;
  }

  /**
   * 失效缓存
   * @deprecated 使用 memoryCache.invalidateByTag('ai-cache') 替代
   */
  async invalidatePattern(pattern: string): Promise<void> {
    memoryCache.invalidateByPrefix(`ai_cache_${pattern}`);
  }

  /**
   * 清空所有缓存
   * @deprecated 使用 memoryCache.clear() 替代
   */
  async clearAll(): Promise<void> {
    memoryCache.invalidateByTag('ai-cache');
  }

  /**
   * 获取缓存统计
   * @deprecated 使用 memoryCache.getStats() 替代
   */
  getStats() {
    return memoryCache.getStats();
  }
}

// 导出单例
export const aiCacheService = AICacheService.getInstance();

// 便捷函数
/**
 * @deprecated 使用统一缓存系统
 */
export const getCachedAIAnalysis = async (params: any, fetchFn: () => Promise<any>) => {
  return aiCacheService.smartGet('ai_analysis', params, fetchFn);
};

/**
 * @deprecated 使用统一缓存系统
 */
export const getCachedSpendingPrediction = async (params: any, fetchFn: () => Promise<any>) => {
  return aiCacheService.smartGet('spending_prediction', params, fetchFn);
};
