/**
 * 预测 API 服务
 */

import { apiClient } from '../client';

/**
 * 综合分析请求参数
 */
export interface ComprehensiveAnalysisParams {
  type: 'comprehensive-analysis' | 'spending-prediction';
  monthsToAnalyze?: number;
  predictionMonths?: number;
}

/**
 * 综合分析响应
 */
export interface ComprehensiveAnalysisResponse {
  spendingPrediction?: {
    predictions: Array<{
      month: string;
      totalAmount: number;
      confidence: number;
      categoryBreakdown: Array<{
        category: string;
        amount: number;
        confidence: number;
      }>;
    }>;
    trends: {
      overall: 'increasing' | 'stable' | 'decreasing';
      keyCategories: Array<{
        category: string;
        trend: 'increasing' | 'stable' | 'decreasing';
        changeRate: number;
      }>;
    };
    insights: string[];
    riskFactors: Array<{
      type: string;
      description: string;
      severity: 'high' | 'medium' | 'low';
    }>;
  };
  anomalyDetection?: {
    anomalies: Array<{
      type: string;
      description: string;
      severity: 'high' | 'medium' | 'low';
      amount?: number;
      month?: string;
    }>;
    overallStability: {
      stable: boolean;
      score: number;
      description: string;
    };
  };
  budgetRecommendation?: {
    monthlyBudget: {
      current: number;
      recommended: number;
      potentialSavings: number;
      savingsRate: number;
    };
    categoryBudgets: Array<{
      category: string;
      currentAvg: number;
      recommendedBudget: number;
      potentialSavings: number;
      priority: 'high' | 'medium' | 'low';
    }>;
  };
}

/**
 * 预测 API 服务
 */
export const predictApi = {
  /**
   * 综合分析
   */
  analyze(params: ComprehensiveAnalysisParams): Promise<ComprehensiveAnalysisResponse> {
    return apiClient.post<ComprehensiveAnalysisResponse>('/api/predict', params);
  },
};
