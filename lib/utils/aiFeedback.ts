export const AI_FEEDBACK_FEATURE_NAME_MAP: Record<string, string> = {
  spending_prediction: '支出预测',
  smart_analysis: '智能分析',
  budget_recommendation: '预算建议',
  anomaly_detection: '异常检测',
  auto_categorization: '自动分类',
  deep_insight: '深度洞察',
};

export function getAIFeedbackFeatureName(feature: string): string {
  return AI_FEEDBACK_FEATURE_NAME_MAP[feature] || feature;
}
