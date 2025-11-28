/**
 * AI 反馈仓储接口
 * 定义所有 AI 反馈和请求数据访问的标准接口
 */

export type AIFeatureType =
  | 'spending_analysis'
  | 'prediction'
  | 'smart_suggestion'
  | 'budget_advice'
  | 'consumption_habits'
  | 'weekly_report';

export type FeedbackType =
  | 'rating'
  | 'thumbs'
  | 'choice'
  | 'comment'
  | 'composite';

export interface AIFeedback {
  id: string;
  feature_type: AIFeatureType;
  feedback_type: FeedbackType;
  session_id: string | null;
  user_id: string | null;
  rating: number | null;
  is_positive: boolean | null;
  comment: string | null;
  choices: string[] | null;
  custom_data: Record<string, any> | null;
  context: Record<string, any> | null;
  ai_request_id: string | null;
  timestamp: string;
  user_agent: string | null;
  client_version: string | null;
  tags: string[];
  priority: string;
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIRequest {
  id: string;
  ai_provider: string;
  model_name: string | null;
  request_type: string;
  feature_type: string;
  session_id: string | null;
  user_id: string | null;
  input_data: Record<string, any>;
  parameters: Record<string, any> | null;
  prompt: string | null;
  response_data: Record<string, any> | null;
  response_text: string | null;
  tokens_used: { input: number; output: number; total: number } | null;
  response_time_ms: number | null;
  status: string;
  error_code: string | null;
  error_message: string | null;
  timestamp: string;
  user_agent: string | null;
  request_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIPerformanceStat {
  id: string;
  stat_date: string;
  ai_provider: string;
  feature_type: string;
  model_name: string | null;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time_ms: number | null;
  total_tokens: number;
  estimated_cost: number;
}

export interface CreateAIFeedbackDTO {
  feature_type: AIFeatureType;
  feedback_type: FeedbackType;
  session_id?: string;
  rating?: number;
  is_positive?: boolean;
  comment?: string;
  choices?: string[];
  custom_data?: Record<string, any>;
  context?: Record<string, any>;
  ai_request_id?: string;
  user_agent?: string;
  client_version?: string;
  tags?: string[];
  priority?: string;
}

export interface CreateAIRequestDTO {
  ai_provider: string;
  model_name?: string;
  request_type: string;
  feature_type: string;
  session_id?: string;
  input_data: Record<string, any>;
  parameters?: Record<string, any>;
  prompt?: string;
  response_data?: Record<string, any>;
  response_text?: string;
  tokens_used?: { input: number; output: number; total: number };
  response_time_ms?: number;
  status?: string;
  error_code?: string;
  error_message?: string;
  user_agent?: string;
  request_id?: string;
}

export interface AIFeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  positiveRate: number;
  timeStats: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface AIFeedbackFilter {
  featureType?: AIFeatureType;
  status?: string;
  dateRange?: { start: string; end: string };
  rating?: { min?: number; max?: number };
  limit?: number;
  offset?: number;
}

/**
 * AI 反馈仓储接口
 */
export interface IAIFeedbackRepository {
  // Feedback 相关
  findFeedbackById(id: string): Promise<AIFeedback | null>;
  findFeedbacks(filter?: AIFeedbackFilter): Promise<AIFeedback[]>;
  createFeedback(data: CreateAIFeedbackDTO): Promise<AIFeedback>;
  updateFeedbackStatus(
    id: string,
    status: string,
    adminNotes?: string,
    resolvedBy?: string
  ): Promise<void>;
  deleteFeedback(id: string): Promise<void>;
  getFeedbackStats(featureType?: AIFeatureType, days?: number): Promise<AIFeedbackStats>;

  // Request 相关
  createRequest(data: CreateAIRequestDTO): Promise<AIRequest>;
  findRequestById(id: string): Promise<AIRequest | null>;

  // Performance stats 相关
  getPerformanceStats(dateRange?: { start: string; end: string }): Promise<{
    stats: AIPerformanceStat[];
    totalCost: number;
    totalTokens: number;
    avgResponseTime: number;
  }>;

  // Template 相关
  findTemplateById(id: string): Promise<any | null>;
  findTemplatesByFeature(featureType: AIFeatureType): Promise<any[]>;
}
