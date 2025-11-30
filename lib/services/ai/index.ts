/**
 * AI 服务统一导出 - 客户端版本
 * 通过 API 服务调用服务端功能
 */

import { aiApi } from '@/lib/api/services/ai';
import type { AIFeedback, FeedbackTemplate, AIFeatureType } from '@/types/ai-feedback';

// 重新导出类型
export type {
  AIFeedback,
  AIFeedbackStats,
  AIFeatureType,
  FeedbackType
} from '@/types/ai-feedback';

/**
 * AI 反馈服务 - 客户端版本
 * 使用统一的 API 服务层
 */
class AIFeedbackServiceClient {
  private static instance: AIFeedbackServiceClient;

  static getInstance(): AIFeedbackServiceClient {
    if (!AIFeedbackServiceClient.instance) {
      AIFeedbackServiceClient.instance = new AIFeedbackServiceClient();
    }
    return AIFeedbackServiceClient.instance;
  }

  /**
   * 收集反馈
   */
  async collectFeedback(
    featureType: string,
    data: unknown
  ): Promise<string> {
    const result = await aiApi.collectFeedback({
      featureType,
      feedbackType: (data as { feedbackType?: string })?.feedbackType || 'composite',
      data,
    });
    return result.feedbackId;
  }

  /**
   * 获取统计数据
   */
  async getFeedbackStats(
    featureType?: string,
    period: '24h' | '7d' | '30d' = '7d'
  ): Promise<unknown> {
    const result = await aiApi.getFeedbackStats({ featureType, period });
    return result.data;
  }

  /**
   * 获取所有反馈
   */
  async getAllFeedbacks(limit: number = 100, offset: number = 0): Promise<AIFeedback[]> {
    const result = await aiApi.getAllFeedbacks({ limit, offset });
    return result.data as AIFeedback[];
  }

  /**
   * 获取反馈模板（客户端使用默认模板）
   */
  getTemplate(templateId: string): FeedbackTemplate | null {
    // 从 templateId 中提取 featureType
    const featureType = templateId.replace(/_rating$/, '') as AIFeatureType;

    // 返回默认模板
    return {
      id: templateId,
      name: `${featureType} 反馈`,
      description: `对 ${featureType} 功能的反馈`,
      featureType,
      feedbackType: 'rating',
      config: {
        title: '您对此功能的体验如何？',
        description: '您的反馈将帮助我们改进服务',
        questions: [
          {
            id: 'rating',
            type: 'rating',
            label: '整体评分',
            required: true,
            min: 1,
            max: 5,
          },
          {
            id: 'feedback',
            type: 'text',
            label: '其他建议',
            placeholder: '请输入您的建议...',
            required: false,
          },
        ],
      },
      display: {
        position: 'modal',
        autoShow: false,
      },
    };
  }
}

// 导出单例和便捷函数
export const aiFeedbackService = AIFeedbackServiceClient.getInstance();

export async function collectAIFeedback(featureType: string, data: unknown): Promise<string> {
  return aiFeedbackService.collectFeedback(featureType, data);
}

export async function getAIFeedbackStats(
  featureType?: string,
  period: '24h' | '7d' | '30d' = '7d'
): Promise<unknown> {
  return aiFeedbackService.getFeedbackStats(featureType, period);
}

/**
 * 记录 AI 请求（空实现，实际记录在服务端完成）
 */
export async function logAIRequest(_data: unknown): Promise<void> {
  // 客户端不直接记录，由服务端 API 处理
  console.debug('AI request logged via server');
}

// 为了兼容旧代码，导出类
export { AIFeedbackServiceClient as AIFeedbackService };
