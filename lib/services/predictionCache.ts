/**
 * 预测结果缓存服务
 * 用于缓存AI预测结果，提高性能和用户体验
 * 支持浏览器和服务端环境
 */

import { STORAGE_KEYS } from '@/lib/config/storageKeys';
import { CACHE_TTL } from '@/lib/config/cacheConfig';

// 检测是否在服务端环境
const isServer = typeof window === 'undefined';

interface PredictionCache {
  data: any; // 预测结果数据
  timestamp: number;
  params: {
    monthsToAnalyze: number;
    predictionMonths: number;
    confidenceThreshold: number;
    lastTransactionDate?: string;
    transactionCount: number;
  };
  version: string; // 缓存版本，用于兼容性
}

interface UserFeedbackRecord {
  id: string;
  accuracyRating: number;
  helpfulRating: number;
  comment: string;
  timestamp: string;
  predictionParams: {
    monthsToAnalyze: number;
    predictionMonths: number;
    confidenceThreshold: number;
  };
}

class PredictionCacheService {
  private static instance: PredictionCacheService;
  // 使用统一的 storage keys 和 TTL 配置
  private readonly CACHE_KEY = STORAGE_KEYS.PREDICTION_CACHE;
  private readonly FEEDBACK_KEY = STORAGE_KEYS.PREDICTION_FEEDBACKS;
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_TTL = CACHE_TTL.PREDICTION;

  static getInstance(): PredictionCacheService {
    if (!PredictionCacheService.instance) {
      PredictionCacheService.instance = new PredictionCacheService();
    }
    return PredictionCacheService.instance;
  }

  /**
   * 获取缓存的预测结果
   */
  getCachedPrediction(params: {
    monthsToAnalyze: number;
    predictionMonths: number;
    confidenceThreshold: number;
    lastTransactionDate?: string;
    transactionCount: number;
  }): any | null {
    // 在服务端环境中直接返回null，不使用缓存
    if (isServer) {
      return null;
    }

    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cache: PredictionCache = JSON.parse(cached);

      // 检查缓存版本兼容性
      if (cache.version !== this.CACHE_VERSION) {
        this.clearCache();
        return null;
      }

      // 检查缓存是否过期
      const now = Date.now();
      if (now - cache.timestamp > this.CACHE_TTL) {
        this.clearCache();
        return null;
      }

      // 检查参数是否匹配
      const paramsMatch =
        cache.params.monthsToAnalyze === params.monthsToAnalyze &&
        cache.params.predictionMonths === params.predictionMonths &&
        cache.params.confidenceThreshold === params.confidenceThreshold &&
        cache.params.lastTransactionDate === params.lastTransactionDate &&
        cache.params.transactionCount === params.transactionCount;

      if (!paramsMatch) {
        return null;
      }

        return cache.data;

    } catch (error) {
      console.error('读取预测缓存失败:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * 缓存预测结果
   */
  setCachedPrediction(
    data: any,
    params: {
      monthsToAnalyze: number;
      predictionMonths: number;
      confidenceThreshold: number;
      lastTransactionDate?: string;
      transactionCount: number;
    }
  ): void {
    // 在服务端环境中跳过缓存
    if (isServer) {
        return;
    }

    try {
      const cache: PredictionCache = {
        data,
        timestamp: Date.now(),
        params,
        version: this.CACHE_VERSION
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    
    } catch (error) {
      console.error('缓存预测结果失败:', error);
    }
  }

  /**
   * 清除预测缓存
   */
  clearCache(): void {
    // 在服务端环境中跳过缓存操作
    if (isServer) {
          return;
    }

    try {
      localStorage.removeItem(this.CACHE_KEY);
          } catch (error) {
      console.error('清除缓存失败:', error);
    }
  }

  /**
   * 保存用户反馈到本地存储
   */
  saveUserFeedback(feedback: Omit<UserFeedbackRecord, 'id' | 'timestamp'>): void {
    // 在服务端环境中跳过反馈保存
    if (isServer) {
            return;
    }

    try {
      const feedbacks = this.getAllFeedbacks();
      const newFeedback: UserFeedbackRecord = {
        ...feedback,
        id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };

      feedbacks.push(newFeedback);

      // 只保留最近100条反馈
      if (feedbacks.length > 100) {
        feedbacks.splice(0, feedbacks.length - 100);
      }

      localStorage.setItem(this.FEEDBACK_KEY, JSON.stringify(feedbacks));
      
    } catch (error) {
      console.error('保存用户反馈失败:', error);
    }
  }

  /**
   * 获取所有用户反馈
   */
  getAllFeedbacks(): UserFeedbackRecord[] {
    // 在服务端环境中返回空数组
    if (isServer) {
      return [];
    }

    try {
      const feedbacks = localStorage.getItem(this.FEEDBACK_KEY);
      return feedbacks ? JSON.parse(feedbacks) : [];
    } catch (error) {
      console.error('读取用户反馈失败:', error);
      return [];
    }
  }

  /**
   * 获取反馈统计信息
   */
  getFeedbackStats(): {
    totalFeedbacks: number;
    avgAccuracyRating: number;
    avgHelpfulRating: number;
    recentFeedbacks: UserFeedbackRecord[];
  } {
    const feedbacks = this.getAllFeedbacks();

    if (feedbacks.length === 0) {
      return {
        totalFeedbacks: 0,
        avgAccuracyRating: 0,
        avgHelpfulRating: 0,
        recentFeedbacks: []
      };
    }

    const avgAccuracyRating = feedbacks.reduce((sum, f) => sum + f.accuracyRating, 0) / feedbacks.length;
    const avgHelpfulRating = feedbacks.reduce((sum, f) => sum + f.helpfulRating, 0) / feedbacks.length;

    return {
      totalFeedbacks: feedbacks.length,
      avgAccuracyRating: Math.round(avgAccuracyRating * 10) / 10,
      avgHelpfulRating: Math.round(avgHelpfulRating * 10) / 10,
      recentFeedbacks: feedbacks.slice(-10) // 最近10条
    };
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(): boolean {
    // 在服务端环境中返回false
    if (isServer) {
      return false;
    }

    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return false;

      const cache: PredictionCache = JSON.parse(cached);
      const now = Date.now();

      return cache.version === this.CACHE_VERSION &&
             (now - cache.timestamp) <= this.CACHE_TTL;
    } catch (error) {
      return false;
    }
  }

  /**
   * 强制刷新缓存（当有新交易时调用）
   */
  invalidateCache(): void {
    this.clearCache();
  }
}

// 导出单例实例
export const predictionCache = PredictionCacheService.getInstance();

// 工具函数：检查是否需要刷新缓存
export function shouldRefreshCache(
  lastTransactionDate: string,
  currentTransactionCount: number
): boolean {
  const cached = predictionCache.getCachedPrediction({
    monthsToAnalyze: 6,
    predictionMonths: 3,
    confidenceThreshold: 70,
    lastTransactionDate,
    transactionCount: currentTransactionCount
  });

  return !cached;
}