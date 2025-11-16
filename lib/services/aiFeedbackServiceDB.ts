/**
 * AI反馈数据库服务 - 兼容层
 *
 * @deprecated 此文件已被重构，请使用统一的 AI 反馈服务：
 * - `@/lib/services/ai/AIFeedbackService` - 统一 AI 反馈服务
 * - `@/lib/services/ai` - AI 服务统一导出
 *
 * 此文件保留仅为向后兼容，内部已迁移到新的统一服务。
 * 新服务采用数据库优先策略，并在数据库不可用时自动降级到 localStorage。
 */

import {
  aiFeedbackService as unifiedService,
  collectAIFeedback,
  getAIFeedbackStats,
  logAIRequest
} from '@/lib/services/ai';
import type {
  AIFeedbackRow,
  AIFeedbackInsert,
  AIFeedbackUpdate,
  AIRequestRow,
  AIRequestInsert,
  AIAnalysisRow,
  AIAnalysisInsert,
  AIPerformanceStatsRow,
  AIPerformanceStatsInsert
} from '@/types/database';
import type { AIFeatureType, FeedbackType } from '@/types/ai-feedback';

/**
 * @deprecated 使用 @/lib/services/ai/AIFeedbackService 替代
 */
class AIFeedbackServiceDB {
  private static instance: AIFeedbackServiceDB;

  static getInstance(): AIFeedbackServiceDB {
    if (!AIFeedbackServiceDB.instance) {
      AIFeedbackServiceDB.instance = new AIFeedbackServiceDB();
    }
    return AIFeedbackServiceDB.instance;
  }

  /**
   * 收集反馈
   * @deprecated 使用 collectAIFeedback() 替代
   */
  async collectFeedback(
    featureType: AIFeatureType,
    feedbackData: Partial<AIFeedbackInsert>
  ): Promise<string> {
    return collectAIFeedback(featureType, feedbackData.feedbackType || 'rating', {
      rating: feedbackData.rating,
      isPositive: feedbackData.isPositive,
      comment: feedbackData.comment,
      choices: feedbackData.choices,
      customData: feedbackData.customData,
      context: feedbackData.context,
      tags: feedbackData.tags,
      priority: feedbackData.priority
    });
  }

  /**
   * 获取所有反馈
   * @deprecated 使用 aiFeedbackService.getAllFeedbacks() 替代
   */
  async getAllFeedbacks(limit: number = 1000, offset: number = 0): Promise<AIFeedbackRow[]> {
    return unifiedService.getAllFeedbacks(limit, offset);
  }

  /**
   * 根据条件筛选反馈
   * @deprecated 使用 aiFeedbackService.getFilteredFeedbacks() 替代
   */
  async getFilteredFeedbacks(filters: {
    featureType?: AIFeatureType;
    status?: string;
    dateRange?: { start: string; end: string };
    rating?: { min?: number; max?: number };
    limit?: number;
    offset?: number;
  } = {}): Promise<AIFeedbackRow[]> {
    return unifiedService.getFilteredFeedbacks(filters);
  }

  /**
   * 获取反馈统计
   * @deprecated 使用 getAIFeedbackStats() 替代
   */
  async getFeedbackStats(): Promise<{
    totalFeedbacks: number;
    averageRating: number;
    positiveRate: number;
    featureStats: Record<string, {
      count: number;
      avgRating: number;
      positiveRate: number;
    }>;
    timeStats: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
    recentFeedbacks: AIFeedbackRow[];
    sentimentAnalysis: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }> {
    return getAIFeedbackStats();
  }

  /**
   * 更新反馈状态
   * @deprecated 使用 aiFeedbackService.updateFeedbackStatus() 替代
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: AIFeedbackRow['status'],
    adminNotes?: string
  ): Promise<void> {
    return unifiedService.updateFeedbackStatus(feedbackId, status, adminNotes);
  }

  /**
   * 删除反馈
   * @deprecated 使用 aiFeedbackService.deleteFeedback() 替代
   */
  async deleteFeedback(feedbackId: string): Promise<void> {
    return unifiedService.deleteFeedback(feedbackId);
  }

  /**
   * 导出反馈数据
   * @deprecated 使用 aiFeedbackService.exportFeedbacks() 替代
   */
  async exportFeedbacks(format: 'json' | 'csv' = 'json'): Promise<string> {
    return unifiedService.exportFeedbacks(format);
  }

  /**
   * 获取反馈模板
   * @deprecated 使用 aiFeedbackService.getTemplate() 替代
   */
  async getTemplate(templateId: string): Promise<any> {
    return unifiedService.getTemplate(templateId);
  }

  /**
   * 获取功能类型的所有模板
   * @deprecated 使用 aiFeedbackService.getTemplatesByFeature() 替代
   */
  async getTemplatesByFeature(featureType: AIFeatureType): Promise<any[]> {
    return unifiedService.getTemplatesByFeature(featureType);
  }

  /**
   * 记录AI请求
   * @deprecated 使用 logAIRequest() 替代
   */
  async logAIRequest(
    aiProvider: string,
    modelName: string,
    featureType: string,
    requestType: string,
    inputData: any,
    prompt: string,
    responseData: any,
    responseTimeMs?: number,
    tokensUsed?: { input: number; output: number; total: number },
    status: 'success' | 'error' | 'timeout' | 'cancelled' = 'success',
    errorMessage?: string
  ): Promise<string> {
    return logAIRequest(
      aiProvider,
      modelName,
      featureType,
      requestType,
      inputData,
      prompt,
      responseData,
      responseTimeMs || 0,
      tokensUsed,
      status,
      errorMessage
    );
  }

  /**
   * 获取性能统计
   * @deprecated 使用 aiFeedbackService.getPerformanceStats() 替代
   */
  async getPerformanceStats(dateRange?: { start: string; end: string }): Promise<any> {
    return unifiedService.getPerformanceStats(dateRange);
  }
}

// 导出单例实例
export const aiFeedbackServiceDB = AIFeedbackServiceDB.getInstance();
