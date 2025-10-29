/**
 * AI智能缓存服务
 * L1缓存(localStorage) + L2数据库(Supabase) + L3 AI服务
 * 支持智能缓存失效、预热和降级策略
 */

import { aiFeedbackServiceDB } from './aiFeedbackServiceDB';
import type { AIFeatureType, FeedbackType } from '@/types/ai-feedback';

// 检查是否在浏览器环境中
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// 缓存配置
interface CacheConfig {
  ttl: number; // 生存时间(毫秒)
  maxSize: number; // 最大缓存条目数
  version: string; // 缓存版本号
}

// 缓存条目
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  etag?: string; // 实体标签，用于版本比较
}

// 缓存统计
interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  lastCleanup: number;
  size: number;
}

// 不同类型数据的缓存配置
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  ai_analysis: {
    ttl: 30 * 60 * 1000, // 30分钟
    maxSize: 50,
    version: '1.0'
  },
  spending_prediction: {
    ttl: 60 * 60 * 1000, // 1小时
    maxSize: 20,
    version: '1.0'
  },
  feedback_stats: {
    ttl: 5 * 60 * 1000, // 5分钟
    maxSize: 100,
    version: '1.0'
  },
  ai_request_logs: {
    ttl: 24 * 60 * 60 * 1000, // 24小时
    maxSize: 200,
    version: '1.0'
  }
};

class AICacheService {
  private static instance: AICacheService;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    lastCleanup: Date.now(),
    size: 0
  };

  static getInstance(): AICacheService {
    if (!AICacheService.instance) {
      AICacheService.instance = new AICacheService();
    }
    return AICacheService.instance;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `ai_cache_${type}_${sortedParams}`;
  }

  /**
   * 获取缓存配置
   */
  private getConfig(type: string): CacheConfig {
    return CACHE_CONFIGS[type] || {
      ttl: 30 * 60 * 1000, // 默认30分钟
      maxSize: 50,
      version: '1.0'
    };
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * 清理过期缓存
   */
  private cleanup(type?: string): void {
    if (!isBrowser) return;

    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ai_cache_')) {
        if (type && !key.includes(`_${type}_`)) continue;

        try {
          const entry: CacheEntry<any> = JSON.parse(localStorage.getItem(key) || '{}');
          if (this.isExpired(entry)) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // 无效数据，直接删除
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.stats.lastCleanup = now;
    this.updateCacheSize();
  }

  /**
   * 更新缓存大小统计
   */
  private updateCacheSize(): void {
    if (!isBrowser) {
      this.stats.size = 0;
      return;
    }

    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ai_cache_')) {
        size++;
      }
    }
    this.stats.size = size;
  }

  /**
   * 更新缓存统计
   */
  private updateStats(hit: boolean): void {
    this.stats.totalRequests++;
    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
  }

  /**
   * 获取缓存数据 (L1)
   */
  async get<T>(type: string, params: Record<string, any> = {}): Promise<T | null> {
    if (!isBrowser) {
      this.updateStats(false);
      return null;
    }

    const key = this.generateCacheKey(type, params);
    const config = this.getConfig(type);

    try {
      const entryJson = localStorage.getItem(key);
      if (!entryJson) {
        this.updateStats(false);
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(entryJson);

      // 检查版本和过期时间
      if (entry.version !== config.version || this.isExpired(entry)) {
        localStorage.removeItem(key);
        this.updateStats(false);
        return null;
      }

      this.updateStats(true);
      return entry.data;

    } catch (error) {
      console.error('L1缓存读取失败:', error);
      localStorage.removeItem(key);
      this.updateStats(false);
      return null;
    }
  }

  /**
   * 设置缓存数据 (L1)
   */
  async set<T>(type: string, data: T, params: Record<string, any> = {}, customTtl?: number): Promise<void> {
    if (!isBrowser) return;

    const key = this.generateCacheKey(type, params);
    const config = this.getConfig(type);

    // 检查缓存大小限制
    this.cleanup(type);
    this.updateCacheSize();

    const typeCount = Array.from({ length: localStorage.length }, (_, i) => {
      const k = localStorage.key(i);
      return k?.startsWith(`ai_cache_${type}_`) ? 1 : 0;
    }).reduce((sum, count) => sum + count, 0);

    if (typeCount >= config.maxSize) {
      // 删除最旧的条目
      const oldestKey = this.findOldestKey(type);
      if (oldestKey) {
        localStorage.removeItem(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: customTtl || config.ttl,
      version: config.version
    };

    try {
      localStorage.setItem(key, JSON.stringify(entry));
        } catch (error) {
      console.error('L1缓存保存失败:', error);
      // 可能是存储空间不足，强制清理
      this.cleanup();
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (retryError) {
        console.error('L1缓存保存重试失败:', retryError);
      }
    }
  }

  /**
   * 查找最旧的缓存键
   */
  private findOldestKey(type: string): string | null {
    if (!isBrowser) return null;

    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`ai_cache_${type}_`)) {
        try {
          const entry: CacheEntry<any> = JSON.parse(localStorage.getItem(key) || '{}');
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            oldestKey = key;
          }
        } catch (error) {
          // 无效数据，返回这个键进行删除
          return key;
        }
      }
    }

    return oldestKey;
  }

  /**
   * 删除特定缓存
   */
  delete(type: string, params: Record<string, any> = {}): void {
    if (!isBrowser) return;

    const key = this.generateCacheKey(type, params);
    localStorage.removeItem(key);
    }

  /**
   * 清空所有AI缓存
   */
  clear(): void {
    if (!isBrowser) return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ai_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      lastCleanup: Date.now(),
      size: 0
    };
      }

  /**
   * 智能获取数据 (L1 -> L2 -> L3)
   */
  async smartGet<T>(
    type: string,
    params: Record<string, any> = {},
    fetchFn: () => Promise<T>,
    options: {
      skipDatabase?: boolean;
      forceRefresh?: boolean;
      customTtl?: number;
    } = {}
  ): Promise<T> {
    // 1. 强制刷新时跳过L1缓存
    if (!options.forceRefresh) {
      const cached = await this.get<T>(type, params);
      if (cached !== null) {
        return cached;
      }
    }

    // 2. 尝试从数据库获取 (L2)
    if (!options.skipDatabase) {
      try {
        const dbData = await this.getFromDatabase<T>(type, params);
        if (dbData !== null) {
          // 将数据库数据缓存到L1
          await this.set(type, dbData, params, options.customTtl);
          return dbData;
        }
      } catch (error) {
        console.warn('L2数据库获取失败，降级到L3:', error);
      }
    }

    // 3. 从AI服务获取 (L3)
        const data = await fetchFn();

    // 4. 保存到缓存和数据库
    await Promise.all([
      this.set(type, data, params, options.customTtl),
      this.saveToDatabase(type, params, data)
    ]);

    return data;
  }

  /**
   * 从数据库获取数据 (L2)
   */
  private async getFromDatabase<T>(type: string, params: Record<string, any>): Promise<T | null> {
    // 这里根据不同的type实现不同的数据库查询逻辑
    switch (type) {
      case 'feedback_stats':
        return (await aiFeedbackServiceDB.getFeedbackStats(params)) as T;
      case 'ai_feedbacks':
        return (await aiFeedbackServiceDB.getAllFeedbacks(
          params.limit || 100,
          params.offset || 0
        )) as T;
      default:
        return null;
    }
  }

  /**
   * 保存数据到数据库 (L2)
   */
  private async saveToDatabase(type: string, params: Record<string, any>, data: any): Promise<void> {
    // 某些类型的数据需要保存到数据库
    // 反馈数据会在aiFeedbackService中自动保存
    // 这里主要用于保存分析结果等
  }

  /**
   * 预热缓存
   */
  async warmup(): Promise<void> {
    
    try {
      // 预加载常用数据
      const warmupTasks = [
        // 预加载反馈统计
        this.smartGet(
          'feedback_stats',
          {},
          async () => await aiFeedbackServiceDB.getFeedbackStats()
        ),
        // 可以添加更多预热任务
      ];

      await Promise.allSettled(warmupTasks);
          } catch (error) {
      console.error('❌ AI缓存预热失败:', error);
    }
  }

  /**
   * 失效相关缓存
   */
  invalidatePattern(pattern: string): void {
    if (!isBrowser) return;

    const regex = new RegExp(pattern);
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ai_cache_') && regex.test(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
      }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats & { configs: typeof CACHE_CONFIGS } {
    this.updateCacheSize();
    return {
      ...this.stats,
      configs: CACHE_CONFIGS
    };
  }

  /**
   * 导出缓存数据 (用于调试)
   */
  export(): Record<string, any> {
    if (!isBrowser) return {};

    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ai_cache_')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || '{}');
        } catch (error) {
          data[key] = { error: 'Invalid JSON' };
        }
      }
    }
    return data;
  }

  /**
   * 检查缓存健康状态
   */
  healthCheck(): {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查命中率
    if (this.stats.hitRate < 0.3 && this.stats.totalRequests > 10) {
      issues.push('缓存命中率过低');
      recommendations.push('考虑增加缓存TTL或预热策略');
    }

    // 检查缓存大小
    if (this.stats.size > 500) {
      issues.push('缓存条目过多');
      recommendations.push('考虑减小maxSize或增加清理频率');
    }

    // 检查最后清理时间
    const timeSinceCleanup = Date.now() - this.stats.lastCleanup;
    if (timeSinceCleanup > 60 * 60 * 1000) { // 1小时
      recommendations.push('建议执行缓存清理');
    }

    return {
      status: issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'warning' : 'error',
      issues,
      recommendations
    };
  }
}

// 导出单例实例
export const aiCacheService = AICacheService.getInstance();

// 导出便捷函数
export const getCachedAIAnalysis = (params: any) =>
  aiCacheService.smartGet('ai_analysis', params, () => fetchAIAnalysis(params));

export const getCachedSpendingPrediction = (params: any) =>
  aiCacheService.smartGet('spending_prediction', params, () => fetchSpendingPrediction(params));

export const getCachedFeedbackStats = (params: any = {}) =>
  aiCacheService.smartGet('feedback_stats', params, () => aiFeedbackServiceDB.getFeedbackStats());

// 缓存失效函数
export const invalidateAICache = (pattern?: string) => {
  if (pattern) {
    aiCacheService.invalidatePattern(pattern);
  } else {
    aiCacheService.clear();
  }
};

// 降级获取函数 (仅从数据库获取)
export const getFromDatabaseOnly = async (type: string, params: any = {}) => {
  return aiCacheService.smartGet(type, params, async () => {
    throw new Error('Database fallback not available');
  }, { skipDatabase: false, forceRefresh: true });
};