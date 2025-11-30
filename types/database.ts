/**
 * 数据库类型定义
 * 基于 Prisma schema 生成的类型别名
 */

// AI Feedback 相关类型
export interface AIFeedbackRow {
  id: string;
  feature_type: string;
  feedback_type: string;
  session_id?: string | null;
  user_id?: string | null;
  rating?: number | null;
  is_positive?: boolean | null;
  comment?: string | null;
  choices?: string[];
  custom_data?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
  ai_request_id?: string | null;
  timestamp?: Date | null;
  user_agent?: string | null;
  client_version?: string | null;
  ip_address?: string | null;
  tags?: string[];
  priority?: string | null;
  status?: string | null;
  admin_notes?: string | null;
  resolved_at?: Date | null;
  resolved_by?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export type AIFeedbackInsert = Omit<AIFeedbackRow, 'id' | 'created_at' | 'updated_at'>;
export type AIFeedbackUpdate = Partial<AIFeedbackInsert>;

// AI Request 相关类型
export interface AIRequestRow {
  id: string;
  ai_provider: string;
  model_name?: string | null;
  request_type: string;
  feature_type: string;
  session_id?: string | null;
  user_id?: string | null;
  input_data: Record<string, unknown>;
  parameters?: Record<string, unknown> | null;
  prompt?: string | null;
  response_data?: Record<string, unknown> | null;
  response_text?: string | null;
  tokens_used?: Record<string, unknown> | null;
  response_time_ms?: number | null;
  status?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  timestamp?: Date | null;
  user_agent?: string | null;
  ip_address?: string | null;
  request_id?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export type AIRequestInsert = Omit<AIRequestRow, 'id' | 'created_at' | 'updated_at'>;

// AI Analysis 相关类型
export interface AIAnalysisRow {
  id: string;
  feedback_id?: string | null;
  request_id?: string | null;
  sentiment?: string | null;
  confidence?: number | null;
  keywords?: string[];
  categories?: string[];
  severity?: string | null;
  suggestions?: string[];
  analyzed_at?: Date | null;
  analysis_model?: string | null;
  processing_time_ms?: number | null;
  version?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export type AIAnalysisInsert = Omit<AIAnalysisRow, 'id' | 'created_at' | 'updated_at'>;

// AI Performance Stats 相关类型
export interface AIPerformanceStatsRow {
  id: string;
  stat_date: Date;
  ai_provider: string;
  feature_type: string;
  model_name?: string | null;
  total_requests?: number | null;
  successful_requests?: number | null;
  failed_requests?: number | null;
  avg_response_time_ms?: number | null;
  min_response_time_ms?: number | null;
  max_response_time_ms?: number | null;
  p95_response_time_ms?: number | null;
  total_tokens?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  estimated_cost?: number | null;
  error_rates?: Record<string, unknown> | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export type AIPerformanceStatsInsert = Omit<AIPerformanceStatsRow, 'id' | 'created_at' | 'updated_at'>;
