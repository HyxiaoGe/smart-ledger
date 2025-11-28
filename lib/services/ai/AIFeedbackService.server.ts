/**
 * 统一 AI 反馈服务 - 服务端版本
 * 使用 Repository 模式，支持 Prisma/Supabase 切换
 */

import { getAIFeedbackRepository } from '@/lib/infrastructure/repositories/index.server';
import { memoryCache } from '@/lib/infrastructure/cache';
import { STORAGE_KEYS } from '@/lib/config/storageKeys';
import type {
  AIFeedback,
  AIRequest,
  AIFeedbackStats,
  AIFeatureType,
  CreateAIFeedbackDTO,
  CreateAIRequestDTO,
  AIFeedbackFilter,
} from '@/lib/domain/repositories/IAIFeedbackRepository';

// 重新导出类型
export type { AIFeedback, AIRequest, AIFeedbackStats, AIFeatureType };

export type FeedbackType = 'rating' | 'thumbs' | 'choice' | 'comment' | 'composite';

/**
 * AI 反馈服务
 */
export class AIFeedbackService {
  private static instance: AIFeedbackService;

  static getInstance(): AIFeedbackService {
    if (!AIFeedbackService.instance) {
      AIFeedbackService.instance = new AIFeedbackService();
    }
    return AIFeedbackService.instance;
  }

  /**
   * 收集反馈
   */
  async collectFeedback(
    featureType: AIFeatureType,
    feedbackType: FeedbackType,
    data: Partial<CreateAIFeedbackDTO>
  ): Promise<string> {
    const repository = getAIFeedbackRepository();
    const sessionId = this.getOrCreateSessionId();

    const feedbackData: CreateAIFeedbackDTO = {
      feature_type: featureType,
      feedback_type: feedbackType,
      session_id: sessionId,
      rating: data.rating,
      is_positive: data.is_positive,
      comment: data.comment,
      choices: data.choices,
      custom_data: data.custom_data,
      context: data.context || {},
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      client_version: '1.0.0',
      tags: data.tags || [],
      priority: data.priority || 'medium',
    };

    const result = await repository.createFeedback(feedbackData);
    return result.id;
  }

  /**
   * 获取反馈统计
   */
  async getFeedbackStats(
    featureType?: AIFeatureType,
    days: number = 30
  ): Promise<AIFeedbackStats> {
    const cacheKey = `feedback-stats:${featureType || 'all'}:${days}`;

    const cached = memoryCache.get(cacheKey);
    if (cached) {
      return cached as AIFeedbackStats;
    }

    const repository = getAIFeedbackRepository();
    const stats = await repository.getFeedbackStats(featureType, days);

    memoryCache.set(cacheKey, stats, { ttl: 5 * 60 * 1000, tags: ['ai-feedback'] });

    return stats;
  }

  /**
   * 记录 AI 请求
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
    try {
      const repository = getAIFeedbackRepository();

      const requestData: CreateAIRequestDTO = {
        ai_provider: aiProvider,
        model_name: modelName,
        feature_type: featureType,
        request_type: requestType,
        input_data: inputData,
        prompt,
        response_data: responseData,
        response_time_ms: responseTimeMs,
        tokens_used: tokensUsed,
        status,
        error_message: errorMessage,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      };

      const result = await repository.createRequest(requestData);
      return result.id;
    } catch (error) {
      console.error('记录 AI 请求失败:', error);
      return '';
    }
  }

  /**
   * 获取所有反馈（带分页）
   */
  async getAllFeedbacks(limit: number = 1000, offset: number = 0): Promise<AIFeedback[]> {
    const repository = getAIFeedbackRepository();
    return repository.findFeedbacks({ limit, offset });
  }

  /**
   * 根据条件筛选反馈
   */
  async getFilteredFeedbacks(filters: AIFeedbackFilter = {}): Promise<AIFeedback[]> {
    const repository = getAIFeedbackRepository();
    return repository.findFeedbacks(filters);
  }

  /**
   * 更新反馈状态
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: 'pending' | 'reviewed' | 'resolved' | 'archived',
    adminNotes?: string
  ): Promise<void> {
    const repository = getAIFeedbackRepository();
    await repository.updateFeedbackStatus(feedbackId, status, adminNotes);
    this.clearCache();
  }

  /**
   * 删除反馈
   */
  async deleteFeedback(feedbackId: string): Promise<void> {
    const repository = getAIFeedbackRepository();
    await repository.deleteFeedback(feedbackId);
    this.clearCache();
  }

  /**
   * 导出反馈数据
   */
  async exportFeedbacks(format: 'json' | 'csv' = 'json'): Promise<string> {
    const feedbacks = await this.getAllFeedbacks(10000);

    if (format === 'csv') {
      const headers = [
        'ID', '功能类型', '反馈类型', '评分', '是否积极', '评论',
        '状态', '优先级', '标签', '时间', '创建时间'
      ];

      const rows = feedbacks.map((f) => [
        f.id,
        f.feature_type,
        f.feedback_type,
        f.rating || '',
        f.is_positive !== null ? (f.is_positive ? '是' : '否') : '',
        f.comment || '',
        f.status,
        f.priority || '',
        (f.tags || []).join(';'),
        f.timestamp,
        f.created_at
      ]);

      return [headers, ...rows].map((row) => row.join(',')).join('\n');
    }

    return JSON.stringify(feedbacks, null, 2);
  }

  /**
   * 获取反馈模板
   */
  async getTemplate(templateId: string): Promise<any> {
    const repository = getAIFeedbackRepository();
    return repository.findTemplateById(templateId);
  }

  /**
   * 获取功能类型的所有模板
   */
  async getTemplatesByFeature(featureType: AIFeatureType): Promise<any[]> {
    const repository = getAIFeedbackRepository();
    return repository.findTemplatesByFeature(featureType);
  }

  /**
   * 获取性能统计
   */
  async getPerformanceStats(dateRange?: { start: string; end: string }): Promise<any> {
    const repository = getAIFeedbackRepository();
    const result = await repository.getPerformanceStats(dateRange);

    return {
      ...result,
      period: dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10),
      },
    };
  }

  /**
   * 获取或创建会话 ID
   */
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') {
      return `server_session_${Date.now()}`;
    }

    const sessionKey = STORAGE_KEYS.AI_FEEDBACK_SESSION;
    let sessionId = localStorage.getItem(sessionKey);

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(sessionKey, sessionId);
    }

    return sessionId;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    memoryCache.invalidateByTag('ai-feedback');
  }
}

// 导出单例
export const aiFeedbackService = AIFeedbackService.getInstance();

// 便捷函数
export async function collectAIFeedback(
  featureType: AIFeatureType,
  feedbackType: FeedbackType,
  data: Partial<CreateAIFeedbackDTO>
): Promise<string> {
  return aiFeedbackService.collectFeedback(featureType, feedbackType, data);
}

export async function getAIFeedbackStats(
  featureType?: AIFeatureType,
  days: number = 30
): Promise<AIFeedbackStats> {
  return aiFeedbackService.getFeedbackStats(featureType, days);
}

export async function logAIRequest(
  aiProvider: string,
  modelName: string,
  featureType: string,
  requestType: string,
  inputData: any,
  prompt: string,
  responseData: any,
  responseTimeMs: number,
  tokensUsed?: { input: number; output: number; total: number },
  status?: 'success' | 'error' | 'timeout' | 'cancelled',
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
