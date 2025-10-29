/**
 * 数据库表类型定义
 * 对应Supabase数据库中的AI相关表结构
 */

import { Database } from '@/types/supabase';

// AI反馈表类型
export type AIFeedbackRow = Database['public']['Tables']['ai_feedbacks']['Row'];
export type AIFeedbackInsert = Database['public']['Tables']['ai_feedbacks']['Insert'];
export type AIFeedbackUpdate = Database['public']['Tables']['ai_feedbacks']['Update'];

// AI请求日志表类型
export type AIRequestRow = Database['public']['Tables']['ai_requests']['Row'];
export type AIRequestInsert = Database['public']['Tables']['ai_requests']['Insert'];
export type AIRequestUpdate = Database['public']['Tables']['ai_requests']['Update'];

// AI分析结果表类型
export type AIAnalysisRow = Database['public']['Tables']['ai_analyses']['Row'];
export type AIAnalysisInsert = Database['public']['Tables']['ai_analyses']['Insert'];
export type AIAnalysisUpdate = Database['public']['Tables']['ai_analyses']['Update'];

// AI性能统计表类型
export type AIPerformanceStatsRow = Database['public']['Tables']['ai_performance_stats']['Row'];
export type AIPerformanceStatsInsert = Database['public']['Tables']['ai_performance_stats']['Insert'];
export type AIPerformanceStatsUpdate = Database['public']['Tables']['ai_performance_stats']['Update'];

// AI模板配置表类型
export type AIFeedbackTemplateRow = Database['public']['Tables']['ai_feedback_templates']['Row'];
export type AIFeedbackTemplateInsert = Database['public']['Tables']['ai_feedback_templates']['Insert'];
export type AIFeedbackTemplateUpdate = Database['public']['Tables']['ai_feedback_templates']['Update'];

// AI会话记录表类型
export type AISessionRow = Database['public']['Tables']['ai_sessions']['Row'];
export type AISessionInsert = Database['public']['Tables']['ai_sessions']['Insert'];
export type AISessionUpdate = Database['public']['Tables']['ai_sessions']['Update'];

// Token使用统计
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

// AI请求上下文
export interface AIRequestContext {
  featureType: string;
  parameters?: Record<string, any>;
  userInput?: any;
  sessionId?: string;
  userId?: string;
}

// AI响应结果
export interface AIResponse {
  data: any;
  text?: string;
  tokensUsed?: TokenUsage;
  responseTime?: number;
}

// 扩展的反馈数据
export interface ExtendedAIFeedback {
  id: string;
  featureType: string;
  feedbackType: string;
  sessionId?: string;
  userId?: string;
  rating?: number;
  isPositive?: boolean;
  comment?: string;
  choices?: string[];
  customData?: Record<string, any>;
  context: {
    inputData?: any;
    outputData?: any;
    parameters?: Record<string, any>;
    userActions?: string[];
    responseTime?: number;
    aiRequestId?: string;
  };
  timestamp: string;
  userAgent?: string;
  clientVersion?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'resolved' | 'ignored';
  adminNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// 扩展的AI请求记录
export interface ExtendedAIRequest {
  id: string;
  aiProvider: string;
  modelName?: string;
  requestType: string;
  featureType: string;
  sessionId?: string;
  userId?: string;
  inputData: any;
  parameters?: Record<string, any>;
  prompt: string;
  responseData?: any;
  responseText?: string;
  tokensUsed?: TokenUsage;
  responseTimeMs?: number;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  createdAt: string;
  updatedAt: string;
}

// 扩展的AI分析结果
export interface ExtendedAIAnalysis {
  id: string;
  feedbackId?: string;
  requestId?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords: string[];
  categories: string[];
  severity?: 'low' | 'medium' | 'high';
  suggestions: string[];
  analyzedAt: string;
  analysisModel: string;
  processingTimeMs: number;
  version: string;
  createdAt: string;
  updatedAt: string;
}

// 扩展的AI性能统计
export interface ExtendedAIPerformanceStats {
  id: string;
  statDate: string;
  aiProvider: string;
  featureType: string;
  modelName?: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  p95ResponseTimeMs: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  errorRates: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

// 数据库查询选项
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
  filters?: Record<string, any>;
}

// 数据库服务接口
export interface AIFeedbackService {
  // 反馈操作
  createFeedback(feedback: AIFeedbackInsert): Promise<AIFeedbackRow>;
  updateFeedback(id: string, updates: AIFeedbackUpdate): Promise<AIFeedbackRow>;
  deleteFeedback(id: string): Promise<void>;
  getFeedbackById(id: string): Promise<AIFeedbackRow | null>;

  // 批量操作
  getFeedbacks(options?: QueryOptions): Promise<AIFeedbackRow[]>;
  getFeedbacksByFeature(featureType: string, options?: QueryOptions): Promise<AIFeedbackRow[]>;
  getFeedbacksByStatus(status: string, options?: QueryOptions): Promise<AIFeedbackRow[]>;
  getFeedbacksByDateRange(startDate: string, endDate: string, options?: QueryOptions): Promise<AIFeedbackRow[]>;

  // 统计操作
  getFeedbackStats(filters?: Record<string, any>): Promise<any>;
  getFeedbackSummary(): Promise<any>;
}

// AI请求服务接口
export interface AIRequestService {
  // 请求操作
  createRequest(request: AIRequestInsert): Promise<AIRequestRow>;
  updateRequest(id: string, updates: AIRequestUpdate): Promise<AIRequestRow>;
  getRequestById(id: string): Promise<AIRequestRow | null>;

  // 批量操作
  getRequests(options?: QueryOptions): Promise<AIRequestRow[]>;
  getRequestsByFeature(featureType: string, options?: QueryOptions): Promise<AIRequestRow[]>;
  getRequestsByStatus(status: string, options?: QueryOptions): Promise<AIRequestRow[]>;
  getRequestsByProvider(provider: string, options?: QueryOptions): Promise<AIRequestRow[]>;

  // 统计操作
  getRequestStats(filters?: Record<string, any>): Promise<any>;
  getPerformanceStats(dateRange?: { start: string; end: string }): Promise<any>;
}

// AI分析服务接口
export interface AIAnalysisService {
  // 分析操作
  createAnalysis(analysis: AIAnalysisInsert): Promise<AIAnalysisRow>;
  updateAnalysis(id: string, updates: AIAnalysisUpdate): Promise<AIAnalysisRow>;
  getAnalysisById(id: string): Promise<AIAnalysisRow | null>;

  // 批量操作
  getAnalyses(options?: QueryOptions): Promise<AIAnalysisRow[]>;
  getAnalysesByFeedback(feedbackId: string, options?: QueryOptions): Promise<AIAnalysisRow[]>;
  getAnalysesBySentiment(sentiment: string, options?: QueryOptions): Promise<AIAnalysisRow[]>;

  // 统计操作
  getAnalysisStats(filters?: Record<string, any>): Promise<any>;
  getSentimentDistribution(): Promise<any>;
}

// AI性能统计服务接口
export interface AIPerformanceService {
  // 统计操作
  createStats(stats: AIPerformanceStatsInsert): Promise<AIPerformanceStatsRow>;
  updateStats(id: string, updates: AIPerformanceStatsUpdate): Promise<AIPerformanceStatsRow>;
  getStatsById(id: string): Promise<AIPerformanceStatsRow | null>;

  // 查询操作
  getStats(options?: QueryOptions): Promise<AIPerformanceStatsRow[]>;
  getStatsByDateRange(startDate: string, endDate: string, options?: QueryOptions): Promise<AIPerformanceStatsRow[]>;
  getStatsByFeature(featureType: string, options?: QueryOptions): Promise<AIPerformanceStatsRow[]>;
  getStatsByProvider(provider: string, options?: QueryOptions): Promise<AIPerformanceStatsRow[]>;

  // 聚合统计
  getAggregatedStats(dateRange?: { start: string; end: string }): Promise<any>;
  getPerformanceTrends(days: number): Promise<any>;
  getCostAnalysis(dateRange?: { start: string; end: string }): Promise<any>;
}

// 模板服务接口
export interface AIFeedbackTemplateService {
  // 模板操作
  createTemplate(template: AIFeedbackTemplateInsert): Promise<AIFeedbackTemplateRow>;
  updateTemplate(id: string, updates: AIFeedbackTemplateUpdate): Promise<AIFeedbackTemplateRow>;
  deleteTemplate(id: string): Promise<void>;
  getTemplateById(id: string): Promise<AIFeedbackTemplateRow | null>;

  // 查询操作
  getTemplates(options?: QueryOptions): Promise<AIFeedbackTemplateRow[]>;
  getTemplatesByFeature(featureType: string): Promise<AIFeedbackTemplateRow[]>;
  getActiveTemplates(): Promise<AIFeedbackTemplateRow[]>;

  // 模板应用
  applyTemplate(templateId: string, context?: any): Promise<any>;
}

// 会话服务接口
export interface AISessionService {
  // 会话操作
  createSession(session: AISessionInsert): Promise<AISessionRow>;
  updateSession(id: string, updates: AISessionUpdate): Promise<AISessionRow>;
  getSessionById(id: string): Promise<AISessionRow | null>;
  getSessionBySessionId(sessionId: string): Promise<AISessionRow | null>;

  // 查询操作
  getSessions(options?: QueryOptions): Promise<AISessionRow[]>;
  getSessionsByUser(userId: string): Promise<AISessionRow[]>;

  // 会话统计
  getSessionStats(dateRange?: { start: string; end: string }): Promise<any>;
  getActiveSessions(): Promise<number>;
}