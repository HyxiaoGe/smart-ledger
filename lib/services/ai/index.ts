/**
 * AI 服务统一导出 - 客户端版本
 * 通过 API 调用服务端功能
 */

// 重新导出类型
export type {
  AIFeedback,
  AIFeedbackStats,
  AIFeatureType,
  FeedbackType
} from '@/types/ai-feedback';

/**
 * AI 反馈服务 - 客户端版本
 * 通过 API 路由调用服务端
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
    data: any
  ): Promise<string> {
    const response = await fetch('/api/ai-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        featureType,
        feedbackType: data.feedbackType || 'composite',
        data
      })
    });

    if (!response.ok) {
      throw new Error('提交反馈失败');
    }

    const result = await response.json();
    return result.feedbackId;
  }

  /**
   * 获取统计数据
   */
  async getFeedbackStats(
    featureType?: string,
    period: '24h' | '7d' | '30d' = '7d'
  ): Promise<any> {
    const params = new URLSearchParams();
    if (featureType) params.set('featureType', featureType);
    params.set('period', period);

    const response = await fetch(`/api/ai-feedback?${params.toString()}`);

    if (!response.ok) {
      throw new Error('获取统计数据失败');
    }

    const result = await response.json();
    return result.data;
  }
}

// 导出单例和便捷函数
export const aiFeedbackService = AIFeedbackServiceClient.getInstance();

export async function collectAIFeedback(featureType: string, data: any): Promise<string> {
  return aiFeedbackService.collectFeedback(featureType, data);
}

export async function getAIFeedbackStats(
  featureType?: string,
  period: '24h' | '7d' | '30d' = '7d'
): Promise<any> {
  return aiFeedbackService.getFeedbackStats(featureType, period);
}

/**
 * 记录 AI 请求（空实现，实际记录在服务端完成）
 */
export async function logAIRequest(_data: any): Promise<void> {
  // 客户端不直接记录，由服务端 API 处理
  console.debug('AI request logged via server');
}

// 为了兼容旧代码，导出类
export { AIFeedbackServiceClient as AIFeedbackService };
