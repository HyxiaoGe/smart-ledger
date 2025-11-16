/**
 * AI 服务统一导出
 */

// 导出 AI 反馈服务
export {
  AIFeedbackService,
  aiFeedbackService,
  collectAIFeedback,
  getAIFeedbackStats,
  logAIRequest
} from './AIFeedbackService';

// 重新导出类型
export type {
  AIFeedback,
  AIFeedbackStats,
  AIFeatureType,
  FeedbackType
} from '@/types/ai-feedback';
