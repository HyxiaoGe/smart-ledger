'use client';

/**
 * AI 相关 React Query Hooks
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import {
  aiApi,
  type AIPredictionParams,
  type AIAnalysisParams,
  type SmartSuggestionParams,
} from '../services/ai';

/**
 * AI 预测 Hook
 * 使用 mutation 因为这是一个 POST 请求且结果不需要长期缓存
 */
export function useAIPrediction() {
  return useMutation({
    mutationFn: (params: AIPredictionParams) => aiApi.predict(params),
  });
}

/**
 * 获取快速记账建议
 * 使用 query 因为这个结果可以缓存一段时间
 */
export function useQuickSuggestions(timeContext?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.ai.prediction({ type: 'quick-suggestions', timeContext }),
    queryFn: () => aiApi.predict({ type: 'quick-suggestions', timeContext }),
    enabled,
    staleTime: 2 * 60 * 1000, // 2分钟内不重新获取
  });
}

/**
 * AI 分析 Hook
 */
export function useAIAnalysis(params?: AIAnalysisParams, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.ai.analysis(params?.month),
    queryFn: () => aiApi.analyze(params || {}),
    enabled,
    staleTime: 10 * 60 * 1000, // 10分钟内不重新获取
  });
}

/**
 * AI 分析 Mutation（用于手动触发）
 */
export function useAIAnalysisMutation() {
  return useMutation({
    mutationFn: (params: AIAnalysisParams) => aiApi.analyze(params),
  });
}

/**
 * 智能建议 Hook
 */
export function useSmartSuggestions(params?: SmartSuggestionParams, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.ai.suggestions(params),
    queryFn: () => aiApi.getSuggestions(params || {}),
    enabled,
    staleTime: 60 * 1000, // 1分钟内不重新获取
  });
}

/**
 * 记录建议学习
 */
export function useSuggestionLearning() {
  return useMutation({
    mutationFn: (data: { suggestionType: string; accepted: boolean; context?: unknown }) =>
      aiApi.recordSuggestionLearning(data),
  });
}
