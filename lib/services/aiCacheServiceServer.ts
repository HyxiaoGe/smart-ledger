/**
 * 服务端AI缓存服务
 * 仅使用数据库缓存，不使用localStorage
 * 适用于API路由等服务端环境
 */

import { aiFeedbackServiceDB } from './aiFeedbackServiceDB';

// 简化的服务端缓存配置
interface ServerCacheConfig {
  ttl: number; // 生存时间(毫秒)
  version: string; // 缓存版本号
}

const SERVER_CACHE_CONFIGS: Record<string, ServerCacheConfig> = {
  spending_prediction: {
    ttl: 60 * 60 * 1000, // 1小时
    version: '1.0'
  },
  ai_analysis: {
    ttl: 30 * 60 * 1000, // 30分钟
    version: '1.0'
  },
  feedback_stats: {
    ttl: 5 * 60 * 1000, // 5分钟
    version: '1.0'
  }
};

class AICacheServiceServer {
  private static instance: AICacheServiceServer;

  static getInstance(): AICacheServiceServer {
    if (!AICacheServiceServer.instance) {
      AICacheServiceServer.instance = new AICacheServiceServer();
    }
    return AICacheServiceServer.instance;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${type}_${sortedParams}`;
  }

  /**
   * 获取缓存配置
   */
  private getConfig(type: string): ServerCacheConfig {
    return SERVER_CACHE_CONFIGS[type] || {
      ttl: 30 * 60 * 1000, // 默认30分钟
      version: '1.0'
    };
  }

  /**
   * 智能获取数据 (仅L2数据库 + L3 AI服务)
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
    const config = this.getConfig(type);
    const cacheKey = this.generateCacheKey(type, params);

    
    // 在服务端，我们直接调用fetchFn，然后保存到数据库
    // 数据库缓存由具体的业务逻辑处理
    try {
      const data = await fetchFn();
        return data;
    } catch (error) {
      console.error(`❌ 服务端数据获取失败: ${type}`, error);
      throw error;
    }
  }

  /**
   * 记录AI请求到数据库
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
    return aiFeedbackServiceDB.logAIRequest(
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
   * 失效相关缓存（服务端版本）
   * 在服务端，我们主要通过数据库操作来失效缓存
   */
  async invalidatePattern(pattern: string): Promise<void> {
        // 在服务端，缓存失效主要通过更新数据库记录的时间戳
    // 或者通过清除Next.js的缓存标签来实现
  }

  /**
   * 获取缓存统计（服务端版本）
   */
  async getStats(): Promise<{
    databaseQueries: number;
    cacheHits: number;
    aiRequests: number;
  }> {
    // 这里可以从数据库获取统计信息
    // 暂时返回默认值
    return {
      databaseQueries: 0,
      cacheHits: 0,
      aiRequests: 0
    };
  }
}

// 导出单例实例
export const aiCacheServiceServer = AICacheServiceServer.getInstance();

// 便捷函数
export const getServerCachedSpendingPrediction = async (params: any, fetchFn: () => Promise<any>) => {
  return aiCacheServiceServer.smartGet('spending_prediction', params, fetchFn);
};

export const getServerCachedAIAnalysis = async (params: any, fetchFn: () => Promise<any>) => {
  return aiCacheServiceServer.smartGet('ai_analysis', params, fetchFn);
};

export const getServerCachedFeedbackStats = async (params: any = {}) => {
  return aiCacheServiceServer.smartGet(
    'feedback_stats',
    params,
    () => aiFeedbackServiceDB.getFeedbackStats()
  );
};