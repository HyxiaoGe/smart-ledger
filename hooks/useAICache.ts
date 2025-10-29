/**
 * AI缓存管理Hook
 * 提供便捷的缓存操作方法
 */

import { useState, useCallback, useEffect } from 'react';
import { aiCacheService, getCachedFeedbackStats } from '@/lib/services/aiCacheService';
import { aiFeedbackServiceDB } from '@/lib/services/aiFeedbackServiceDB';

export function useAICache() {
  const [cacheStats, setCacheStats] = useState(aiCacheService.getStats());
  const [healthStatus, setHealthStatus] = useState(aiCacheService.healthCheck());

  // 定期更新缓存统计
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(aiCacheService.getStats());
      setHealthStatus(aiCacheService.healthCheck());
    }, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, []);

  // 获取缓存的反馈统计
  const getFeedbackStats = useCallback(async () => {
    return getCachedFeedbackStats();
  }, []);

  // 强制刷新特定缓存
  const refreshCache = useCallback(async (type: string, params: Record<string, any> = {}) => {
    return aiCacheService.smartGet(
      type,
      params,
      async () => {
        // 根据类型调用相应的数据库获取函数
        switch (type) {
          case 'feedback_stats':
            return aiFeedbackServiceDB.getFeedbackStats();
          case 'ai_feedbacks':
            return aiFeedbackServiceDB.getAllFeedbacks(params.limit || 100, params.offset || 0);
          default:
            throw new Error(`Unknown cache type: ${type}`);
        }
      },
      { forceRefresh: true }
    );
  }, []);

  // 清空所有缓存
  const clearAllCache = useCallback(() => {
    aiCacheService.clear();
    setCacheStats(aiCacheService.getStats());
  }, []);

  // 失效特定模式的缓存
  const invalidateCache = useCallback((pattern: string) => {
    aiCacheService.invalidatePattern(pattern);
    setCacheStats(aiCacheService.getStats());
  }, []);

  // 预热缓存
  const warmupCache = useCallback(async () => {
    await aiCacheService.warmup();
    setCacheStats(aiCacheService.getStats());
  }, []);

  // 导出缓存数据（调试用）
  const exportCache = useCallback(() => {
    return aiCacheService.export();
  }, []);

  return {
    // 状态
    cacheStats,
    healthStatus,

    // 操作方法
    getFeedbackStats,
    refreshCache,
    clearAllCache,
    invalidateCache,
    warmupCache,
    exportCache,

    // 便捷方法
    invalidateFeedbackCache: () => invalidateCache('.*feedback.*'),
    invalidateAnalysisCache: () => invalidateCache('.*analysis.*'),
    invalidatePredictionCache: () => invalidateCache('.*prediction.*'),

    // 刷新特定数据
    refreshFeedbackStats: () => refreshCache('feedback_stats'),
    refreshFeedbackList: (limit = 100, offset = 0) =>
      refreshCache('ai_feedbacks', { limit, offset }),
  };
}

/**
 * 使用缓存的反馈统计Hook
 */
export function useCachedFeedbackStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshFeedbackStats } = useAICache();

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await refreshFeedbackStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [refreshFeedbackStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats,
  };
}

/**
 * 缓存管理组件Hook (用于开发调试)
 */
export function useCacheManagement() {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const { cacheStats, healthStatus, clearAllCache, exportCache, warmupCache } = useAICache();

  const getCacheSizeDisplay = () => {
    const size = cacheStats.size;
    if (size < 50) return `${size} 条目 (正常)`;
    if (size < 200) return `${size} 条目 (较多)`;
    return `${size} 条目 (过多)`;
  };

  const getHitRateDisplay = () => {
    const rate = cacheStats.hitRate;
    if (rate === 0) return '无数据';
    return `${(rate * 100).toFixed(1)}%`;
  };

  return {
    // 调试状态
    showDebugInfo,
    setShowDebugInfo,

    // 缓存信息
    cacheStats,
    healthStatus,
    getCacheSizeDisplay,
    getHitRateDisplay,

    // 管理操作
    clearAllCache,
    exportCache,
    warmupCache,
  };
}