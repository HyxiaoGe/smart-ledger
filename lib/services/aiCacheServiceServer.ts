/**
 * 服务端 AI 缓存服务 - 兼容层
 *
 * @deprecated 此文件已被重构，请使用：
 * - `@/lib/infrastructure/cache` - 统一缓存系统
 * - `@/lib/services/ai/AIFeedbackService` - AI 反馈服务
 *
 * 此文件保留仅为向后兼容。
 */

import { aiFeedbackService } from './ai/AIFeedbackService';

/**
 * @deprecated 使用统一缓存系统
 */
class AICacheServiceServer {
  private static instance: AICacheServiceServer;

  static getInstance(): AICacheServiceServer {
    if (!AICacheServiceServer.instance) {
      AICacheServiceServer.instance = new AICacheServiceServer();
    }
    return AICacheServiceServer.instance;
  }

  /**
   * 智能获取数据
   * @deprecated 直接使用 fetchFn 或统一缓存系统
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
    // 服务端直接执行，不做额外缓存
    // Next.js 的 unstable_cache 会处理缓存
    return fetchFn();
  }

  /**
   * 记录 AI 请求
   * @deprecated 使用 aiFeedbackService.logAIRequest() 替代
   */
  async logAIRequest(
    aiProvider: string,
    modelName: string,
    featureType: string,
    requestType: string,
    inputData: any,
    prompt: string,
    responseData: any,
    responseTimeMs: number,
    tokensUsed?: { input: number; output: number; total: number },
    status: 'success' | 'error' | 'timeout' | 'cancelled' = 'success',
    errorMessage?: string
  ): Promise<string> {
    return aiFeedbackService.logAIRequest(
      aiProvider,
      modelName,
      featureType,
      requestType,
      inputData,
      prompt,
      responseData,
      responseTimeMs,
      tokensUsed,
      status,
      errorMessage
    );
  }

  /**
   * @deprecated 无操作
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // 无操作
  }

  /**
   * @deprecated 使用 aiFeedbackService.getFeedbackStats() 替代
   */
  async getStats(): Promise<{
    databaseQueries: number;
    cacheHits: number;
    aiRequests: number;
  }> {
    return {
      databaseQueries: 0,
      cacheHits: 0,
      aiRequests: 0
    };
  }
}

// 导出单例
export const aiCacheServiceServer = AICacheServiceServer.getInstance();

// 便捷函数
/**
 * @deprecated 直接调用 fetchFn
 */
export const getServerCachedSpendingPrediction = async (
  params: any,
  fetchFn: () => Promise<any>
) => {
  return aiCacheServiceServer.smartGet('spending_prediction', params, fetchFn);
};

/**
 * @deprecated 直接调用 fetchFn
 */
export const getServerCachedAIAnalysis = async (params: any, fetchFn: () => Promise<any>) => {
  return aiCacheServiceServer.smartGet('ai_analysis', params, fetchFn);
};

/**
 * @deprecated 使用 aiFeedbackService.getFeedbackStats()
 */
export const getServerCachedFeedbackStats = async (params: any = {}) => {
  return aiFeedbackService.getFeedbackStats();
};
