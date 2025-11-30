/**
 * AI反馈数据库服务 - 兼容层
 *
 * @deprecated 此文件已被重构，请使用统一的 AI 反馈服务：
 * - `@/lib/services/ai/AIFeedbackService` - 统一 AI 反馈服务
 * - `@/lib/services/ai` - AI 服务统一导出
 *
 * 此文件保留仅为向后兼容，内部已迁移到新的统一服务。
 */

import {
  aiFeedbackService as unifiedService,
  getAIFeedbackStats,
} from '@/lib/services/ai';
import type { AIFeedback } from '@/types/ai-feedback';

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
   * 获取所有反馈
   * @deprecated 使用 aiFeedbackService.getAllFeedbacks() 替代
   */
  async getAllFeedbacks(limit: number = 1000, offset: number = 0): Promise<AIFeedback[]> {
    return unifiedService.getAllFeedbacks(limit, offset);
  }

  /**
   * 获取反馈统计
   * @deprecated 使用 getAIFeedbackStats() 替代
   */
  async getFeedbackStats(): Promise<unknown> {
    return getAIFeedbackStats();
  }
}

// 导出单例实例
export const aiFeedbackServiceDB = AIFeedbackServiceDB.getInstance();
