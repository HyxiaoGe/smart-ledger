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
   * 重新验证缓存
   */
  revalidate(tag: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>('/api/revalidate', { tag });
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

  /**
   * 收集 AI 反馈
   */
  collectFeedback(data: {
    featureType: string;
    feedbackType?: string;
    data: unknown;
  }): Promise<{ feedbackId: string }> {
    return apiClient.post<{ feedbackId: string }>('/api/ai-feedback', {
      featureType: data.featureType,
      feedbackType: data.feedbackType || 'composite',
      data: data.data,
    });
  },

  /**
   * 获取 AI 反馈统计
   */
  getFeedbackStats(params?: {
    featureType?: string;
    period?: '24h' | '7d' | '30d';
  }): Promise<{ data: unknown }> {
    const query = new URLSearchParams();
    if (params?.featureType) query.set('featureType', params.featureType);
    if (params?.period) query.set('period', params.period);
    const queryStr = query.toString();
    return apiClient.get<{ data: unknown }>(`/api/ai-feedback${queryStr ? `?${queryStr}` : ''}`);
  },

  /**
   * 获取所有 AI 反馈
   */
  getAllFeedbacks(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ data: unknown }> {
    const query = new URLSearchParams();
    query.set('type', 'list');
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    return apiClient.get<{ data: unknown }>(`/api/ai-feedback?${query.toString()}`);
  },
};
