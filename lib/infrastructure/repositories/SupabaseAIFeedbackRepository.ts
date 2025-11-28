/**
 * Supabase AI 反馈仓储实现
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IAIFeedbackRepository,
  AIFeedback,
  AIRequest,
  AIPerformanceStat,
  CreateAIFeedbackDTO,
  CreateAIRequestDTO,
  AIFeedbackStats,
  AIFeedbackFilter,
  AIFeatureType,
} from '@/lib/domain/repositories/IAIFeedbackRepository';

export class SupabaseAIFeedbackRepository implements IAIFeedbackRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findFeedbackById(id: string): Promise<AIFeedback | null> {
    const { data, error } = await this.supabase
      .from('ai_feedbacks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapFeedbackToEntity(data);
  }

  async findFeedbacks(filter?: AIFeedbackFilter): Promise<AIFeedback[]> {
    let query = this.supabase
      .from('ai_feedbacks')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filter?.featureType) {
      query = query.eq('feature_type', filter.featureType);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.dateRange) {
      query = query
        .gte('timestamp', filter.dateRange.start)
        .lte('timestamp', filter.dateRange.end);
    }
    if (filter?.rating?.min !== undefined) {
      query = query.gte('rating', filter.rating.min);
    }
    if (filter?.rating?.max !== undefined) {
      query = query.lte('rating', filter.rating.max);
    }
    if (filter?.offset !== undefined) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 100) - 1);
    } else if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(this.mapFeedbackToEntity);
  }

  async createFeedback(dto: CreateAIFeedbackDTO): Promise<AIFeedback> {
    const { data, error } = await this.supabase
      .from('ai_feedbacks')
      .insert({
        feature_type: dto.feature_type,
        feedback_type: dto.feedback_type,
        session_id: dto.session_id,
        rating: dto.rating,
        is_positive: dto.is_positive,
        comment: dto.comment,
        choices: dto.choices || [],
        custom_data: dto.custom_data,
        context: dto.context || {},
        ai_request_id: dto.ai_request_id,
        user_agent: dto.user_agent,
        client_version: dto.client_version || '1.0.0',
        tags: dto.tags || [],
        priority: dto.priority || 'medium',
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建反馈失败: ${error.message}`);
    }

    return this.mapFeedbackToEntity(data);
  }

  async updateFeedbackStatus(
    id: string,
    status: string,
    adminNotes?: string,
    resolvedBy?: string
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (adminNotes) {
      updates.admin_notes = adminNotes;
    }

    if (status === 'resolved' || status === 'reviewed') {
      updates.resolved_at = new Date().toISOString();
      if (resolvedBy) {
        updates.resolved_by = resolvedBy;
      }
    }

    const { error } = await this.supabase
      .from('ai_feedbacks')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`更新反馈状态失败: ${error.message}`);
    }
  }

  async deleteFeedback(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ai_feedbacks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`删除反馈失败: ${error.message}`);
    }
  }

  async getFeedbackStats(featureType?: AIFeatureType, days = 30): Promise<AIFeedbackStats> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    let query = this.supabase
      .from('ai_feedbacks')
      .select('*')
      .gte('created_at', sinceDate.toISOString());

    if (featureType) {
      query = query.eq('feature_type', featureType);
    }

    const { data: feedbacks, error } = await query;

    if (error || !feedbacks) {
      return {
        totalFeedbacks: 0,
        averageRating: 0,
        positiveRate: 0,
        timeStats: { today: 0, thisWeek: 0, thisMonth: 0 },
        sentimentAnalysis: { positive: 0, neutral: 0, negative: 0 },
      };
    }

    const total = feedbacks.length;
    const positive = feedbacks.filter((f) => f.is_positive === true).length;
    const negative = feedbacks.filter((f) => f.is_positive === false).length;
    const ratings = feedbacks.filter((f) => f.rating != null).map((f) => f.rating as number);
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return {
      totalFeedbacks: total,
      averageRating: Math.round(avgRating * 100) / 100,
      positiveRate: total > 0 ? positive / total : 0,
      timeStats: {
        today: feedbacks.filter((f) => f.timestamp?.slice(0, 10) === today).length,
        thisWeek: feedbacks.filter((f) => f.timestamp >= weekAgo).length,
        thisMonth: feedbacks.filter((f) => f.timestamp >= monthAgo).length,
      },
      sentimentAnalysis: {
        positive,
        neutral: total - positive - negative,
        negative,
      },
    };
  }

  async createRequest(dto: CreateAIRequestDTO): Promise<AIRequest> {
    const { data, error } = await this.supabase
      .from('ai_requests')
      .insert({
        ai_provider: dto.ai_provider,
        model_name: dto.model_name,
        request_type: dto.request_type,
        feature_type: dto.feature_type,
        session_id: dto.session_id,
        input_data: dto.input_data,
        parameters: dto.parameters,
        prompt: dto.prompt,
        response_data: dto.response_data,
        response_text: dto.response_text,
        tokens_used: dto.tokens_used,
        response_time_ms: dto.response_time_ms,
        status: dto.status || 'success',
        error_code: dto.error_code,
        error_message: dto.error_message,
        user_agent: dto.user_agent,
        request_id: dto.request_id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`记录 AI 请求失败: ${error.message}`);
    }

    return this.mapRequestToEntity(data);
  }

  async findRequestById(id: string): Promise<AIRequest | null> {
    const { data, error } = await this.supabase
      .from('ai_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapRequestToEntity(data);
  }

  async getPerformanceStats(dateRange?: { start: string; end: string }): Promise<{
    stats: AIPerformanceStat[];
    totalCost: number;
    totalTokens: number;
    avgResponseTime: number;
  }> {
    let query = this.supabase
      .from('ai_performance_stats')
      .select('*')
      .order('stat_date', { ascending: false });

    if (dateRange) {
      query = query
        .gte('stat_date', dateRange.start)
        .lte('stat_date', dateRange.end);
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('stat_date', thirtyDaysAgo.toISOString().slice(0, 10));
    }

    const { data, error } = await query;

    if (error || !data) {
      return { stats: [], totalCost: 0, totalTokens: 0, avgResponseTime: 0 };
    }

    const stats = data.map(this.mapPerformanceStatToEntity);
    const totalCost = stats.reduce((sum, stat) => sum + stat.estimated_cost, 0);
    const totalTokens = stats.reduce((sum, stat) => sum + stat.total_tokens, 0);
    const avgResponseTime = stats.length > 0
      ? stats.reduce((sum, stat) => sum + (stat.avg_response_time_ms || 0), 0) / stats.length
      : 0;

    return { stats, totalCost, totalTokens, avgResponseTime };
  }

  async findTemplateById(id: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('ai_feedback_templates')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) return null;
    return data;
  }

  async findTemplatesByFeature(featureType: AIFeatureType): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('ai_feedback_templates')
      .select('*')
      .eq('feature_type', featureType)
      .eq('is_active', true)
      .order('name');

    if (error || !data) return [];
    return data;
  }

  private mapFeedbackToEntity(row: any): AIFeedback {
    return {
      id: row.id,
      feature_type: row.feature_type,
      feedback_type: row.feedback_type,
      session_id: row.session_id,
      user_id: row.user_id,
      rating: row.rating,
      is_positive: row.is_positive,
      comment: row.comment,
      choices: row.choices,
      custom_data: row.custom_data,
      context: row.context,
      ai_request_id: row.ai_request_id,
      timestamp: row.timestamp,
      user_agent: row.user_agent,
      client_version: row.client_version,
      tags: row.tags || [],
      priority: row.priority || 'medium',
      status: row.status || 'pending',
      admin_notes: row.admin_notes,
      resolved_at: row.resolved_at,
      resolved_by: row.resolved_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapRequestToEntity(row: any): AIRequest {
    return {
      id: row.id,
      ai_provider: row.ai_provider,
      model_name: row.model_name,
      request_type: row.request_type,
      feature_type: row.feature_type,
      session_id: row.session_id,
      user_id: row.user_id,
      input_data: row.input_data || {},
      parameters: row.parameters,
      prompt: row.prompt,
      response_data: row.response_data,
      response_text: row.response_text,
      tokens_used: row.tokens_used,
      response_time_ms: row.response_time_ms,
      status: row.status || 'success',
      error_code: row.error_code,
      error_message: row.error_message,
      timestamp: row.timestamp,
      user_agent: row.user_agent,
      request_id: row.request_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapPerformanceStatToEntity(row: any): AIPerformanceStat {
    return {
      id: row.id,
      stat_date: row.stat_date,
      ai_provider: row.ai_provider,
      feature_type: row.feature_type,
      model_name: row.model_name,
      total_requests: row.total_requests || 0,
      successful_requests: row.successful_requests || 0,
      failed_requests: row.failed_requests || 0,
      avg_response_time_ms: row.avg_response_time_ms ? Number(row.avg_response_time_ms) : null,
      total_tokens: row.total_tokens || 0,
      estimated_cost: Number(row.estimated_cost) || 0,
    };
  }
}
