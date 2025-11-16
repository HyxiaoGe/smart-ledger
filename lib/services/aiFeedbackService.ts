/**
 * AI反馈管理服务 - 兼容层
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
  getAIFeedbackStats
} from '@/lib/services/ai';
import type {
  AIFeedback,
  AIFeedbackStats,
  AIFeatureType,
  FeedbackType,
  FeedbackTemplate,
  FeedbackAnalysis,
  FeedbackConfig,
  FeedbackCollectionEvent
} from '@/types/ai-feedback';

/**
 * @deprecated 使用 @/lib/services/ai/AIFeedbackService 替代
 */
class AIFeedbackService {
  private static instance: AIFeedbackService;

  static getInstance(): AIFeedbackService {
    if (!AIFeedbackService.instance) {
      AIFeedbackService.instance = new AIFeedbackService();
    }
    return AIFeedbackService.instance;
  }

  /**
   * 收集反馈
   * @deprecated 使用 collectAIFeedback() 替代
   */
  async collectFeedback(
    featureType: AIFeatureType,
    feedbackData: Partial<AIFeedback>
  ): Promise<string> {
    return collectAIFeedback(featureType, 'rating', feedbackData);
  }

  /**
   * 获取所有反馈
   * @deprecated 使用 aiFeedbackService.getAllFeedbacks() 替代
   */
  getAllFeedbacks(): AIFeedback[] {
    // 注意：新的统一服务是异步的，这里返回空数组
    console.warn('getAllFeedbacks() 已废弃，请使用异步版本的 aiFeedbackService.getAllFeedbacks()');
    return [];
  }

  /**
   * 根据条件筛选反馈
   * @deprecated 使用 aiFeedbackService.getFilteredFeedbacks() 替代
   */
  getFilteredFeedbacks(filters: {
    featureType?: AIFeatureType;
    status?: AIFeedback['status'];
    dateRange?: { start: string; end: string };
    rating?: { min?: number; max?: number };
  } = {}): AIFeedback[] {
    console.warn('getFilteredFeedbacks() 已废弃，请使用异步版本的 aiFeedbackService.getFilteredFeedbacks()');
    return [];
  }

  /**
   * 获取反馈统计
   * @deprecated 使用 getAIFeedbackStats() 替代
   */
  getFeedbackStats(): AIFeedbackStats {
    console.warn('getFeedbackStats() 已废弃，请使用异步版本的 getAIFeedbackStats()');
    return {
      totalFeedbacks: 0,
      averageRating: 0,
      positiveRate: 0,
      featureStats: {} as any,
      timeStats: { today: 0, thisWeek: 0, thisMonth: 0 },
      recentFeedbacks: [],
      sentimentAnalysis: { positive: 0, neutral: 0, negative: 0 }
    };
  }

  /**
   * 获取反馈模板
   * @deprecated 功能已移除，模板管理已集成到统一服务
   */
  getTemplate(templateId: string): FeedbackTemplate | undefined {
    console.warn('getTemplate() 已废弃');
    return undefined;
  }

  /**
   * 获取功能类型的所有模板
   * @deprecated 功能已移除，模板管理已集成到统一服务
   */
  getTemplatesByFeature(featureType: AIFeatureType): FeedbackTemplate[] {
    console.warn('getTemplatesByFeature() 已废弃');
    return [];
  }

  /**
   * 更新反馈状态
   * @deprecated 使用 aiFeedbackService.updateFeedbackStatus() 替代
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: AIFeedback['status'],
    adminNotes?: string
  ): Promise<void> {
    // 转换状态类型：'ignored' -> 'archived'
    const mappedStatus = status === 'ignored' ? 'archived' : status;
    return unifiedService.updateFeedbackStatus(feedbackId, mappedStatus, adminNotes);
  }

  /**
   * 导出反馈数据
   * @deprecated 使用 aiFeedbackService.exportFeedbacks() 替代
   */
  exportFeedbacks(format: 'json' | 'csv' = 'json'): string {
    console.warn('exportFeedbacks() 已废弃，请使用异步版本的 aiFeedbackService.exportFeedbacks()');
    return '';
  }

  /**
   * 获取配置
   * @deprecated 配置管理已内置到统一服务
   */
  getConfig(): FeedbackConfig {
    console.warn('getConfig() 已废弃');
    return {
      enabled: true,
      collection: {
        autoTrigger: true,
        triggerThreshold: 3,
        maxPerSession: 5,
        cooldownMinutes: 5
      },
      storage: {
        retentionDays: 90,
        compressionEnabled: true,
        encryptionEnabled: false
      },
      analysis: {
        autoAnalyze: true,
        sentimentAnalysis: true,
        keywordExtraction: true,
        categorization: true
      },
      notifications: {
        enabled: false,
        thresholds: {
          lowRating: 2,
          negativeCount: 5
        },
        channels: ['in_app']
      }
    };
  }

  /**
   * 更新配置
   * @deprecated 配置管理已内置到统一服务
   */
  updateConfig(newConfig: Partial<FeedbackConfig>): void {
    console.warn('updateConfig() 已废弃');
  }
}

// 导出单例实例
export const aiFeedbackService = AIFeedbackService.getInstance();
