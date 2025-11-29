/**
 * AI 相关 API 服务
 */

import { apiClient } from '../client';

/**
 * AI 预测类型
 */
export type AIPredictionType =
  | 'category'
  | 'amount'
  | 'full'
  | 'quick-suggestions';

/**
 * AI 预测请求参数
 */
export interface AIPredictionParams {
  type: AIPredictionType;
  amount?: number;
  note?: string;
  timeContext?: string;
  category?: string;
}

/**
 * 快速记账建议
 */
export interface QuickTransactionSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  note: string;
  confidence: number;
  icon?: string;
  reason: string;
}

/**
 * AI 预测响应
 */
export interface AIPredictionResponse {
  category?: string;
  amount?: number;
  suggestions?: QuickTransactionSuggestion[];
  confidence?: number;
}

/**
 * AI 分析请求参数
 */
export interface AIAnalysisParams {
  month?: string;
  transactions?: unknown[];
}

/**
 * AI 分析响应
 */
export interface AIAnalysisResponse {
  summary: string;
  insights?: unknown[];
}

/**
 * 智能建议请求参数
 */
export interface SmartSuggestionParams {
  keyword?: string;
  category?: string;
  amount?: number;
  context?: unknown;
}

/**
 * AI API 服务
 */
export const aiApi = {
  /**
   * AI 预测
   */
  predict(params: AIPredictionParams): Promise<AIPredictionResponse> {
    return apiClient.post<AIPredictionResponse>('/api/ai-prediction', params);
  },

  /**
   * AI 分析
   */
  analyze(params: AIAnalysisParams): Promise<AIAnalysisResponse> {
    return apiClient.post<AIAnalysisResponse>('/api/analyze', params);
  },

  /**
   * 智能建议
   */
  getSuggestions(params: SmartSuggestionParams): Promise<unknown> {
    return apiClient.post('/api/smart-suggestions', params);
  },

  /**
   * 记录建议学习
   */
  recordSuggestionLearning(data: {
    suggestionType: string;
    accepted: boolean;
    context?: unknown;
  }): Promise<void> {
    return apiClient.post<void>('/api/smart-suggestions/learning', data);
  },
};
