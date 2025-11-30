/**
 * Prisma AI 反馈仓储实现
 */

import type { PrismaClient } from '@prisma/client';
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

export class PrismaAIFeedbackRepository implements IAIFeedbackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Feedback 相关
  async findFeedbackById(id: string): Promise<AIFeedback | null> {
    const data = await this.prisma.ai_feedbacks.findUnique({
      where: { id },
    });
    return data ? this.mapFeedbackToEntity(data) : null;
  }

  async findFeedbacks(filter?: AIFeedbackFilter): Promise<AIFeedback[]> {
    const where: any = {};

    if (filter?.featureType) {
      where.feature_type = filter.featureType;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.dateRange) {
      where.timestamp = {
        gte: new Date(filter.dateRange.start),
        lte: new Date(filter.dateRange.end),
      };
    }
    if (filter?.rating) {
      where.rating = {};
      if (filter.rating.min !== undefined) {
        where.rating.gte = filter.rating.min;
      }
      if (filter.rating.max !== undefined) {
        where.rating.lte = filter.rating.max;
      }
    }

    const data = await this.prisma.ai_feedbacks.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: filter?.offset,
      take: filter?.limit || 100,
    });

    return data.map(this.mapFeedbackToEntity);
  }

  async createFeedback(data: CreateAIFeedbackDTO): Promise<AIFeedback> {
    const result = await this.prisma.ai_feedbacks.create({
      data: {
        feature_type: data.feature_type,
        feedback_type: data.feedback_type,
        session_id: data.session_id,
        rating: data.rating,
        is_positive: data.is_positive,
        comment: data.comment,
        choices: data.choices || [],
        custom_data: data.custom_data as any,
        context: data.context as any || {},
        ai_request_id: data.ai_request_id,
        user_agent: data.user_agent,
        client_version: data.client_version || '1.0.0',
        tags: data.tags || [],
        priority: data.priority || 'medium',
        status: 'pending',
      },
    });

    return this.mapFeedbackToEntity(result);
  }

  async updateFeedbackStatus(
    id: string,
    status: string,
    adminNotes?: string,
    resolvedBy?: string
  ): Promise<void> {
    const data: any = {
      status,
      updated_at: new Date(),
    };

    if (adminNotes) {
      data.admin_notes = adminNotes;
    }

    if (status === 'resolved' || status === 'reviewed') {
      data.resolved_at = new Date();
      if (resolvedBy) {
        data.resolved_by = resolvedBy;
      }
    }

    await this.prisma.ai_feedbacks.update({
      where: { id },
      data,
    });
  }

  async deleteFeedback(id: string): Promise<void> {
    await this.prisma.ai_feedbacks.delete({
      where: { id },
    });
  }

  async getFeedbackStats(featureType?: AIFeatureType, days = 30): Promise<AIFeedbackStats> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const where: any = {
      created_at: { gte: sinceDate },
    };

    if (featureType) {
      where.feature_type = featureType;
    }

    const feedbacks = await this.prisma.ai_feedbacks.findMany({
      where,
    });

    const total = feedbacks.length;
    const positive = feedbacks.filter((f: { is_positive: boolean | null }) => f.is_positive === true).length;
    const negative = feedbacks.filter((f: { is_positive: boolean | null }) => f.is_positive === false).length;
    const ratings = feedbacks.filter((f: { rating: number | null }) => f.rating != null).map((f: { rating: number | null }) => f.rating as number);
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
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
        today: feedbacks.filter((f: { timestamp: Date | null }) => f.timestamp?.toISOString().slice(0, 10) === today).length,
        thisWeek: feedbacks.filter((f: { timestamp: Date | null }) => f.timestamp && f.timestamp.toISOString() >= weekAgo).length,
        thisMonth: feedbacks.filter((f: { timestamp: Date | null }) => f.timestamp && f.timestamp.toISOString() >= monthAgo).length,
      },
      sentimentAnalysis: {
        positive,
        neutral: total - positive - negative,
        negative,
      },
    };
  }

  // Request 相关
  async createRequest(data: CreateAIRequestDTO): Promise<AIRequest> {
    const result = await this.prisma.ai_requests.create({
      data: {
        ai_provider: data.ai_provider,
        model_name: data.model_name,
        request_type: data.request_type,
        feature_type: data.feature_type,
        session_id: data.session_id,
        input_data: data.input_data as any,
        parameters: data.parameters as any,
        prompt: data.prompt,
        response_data: data.response_data as any,
        response_text: data.response_text,
        tokens_used: data.tokens_used as any,
        response_time_ms: data.response_time_ms,
        status: data.status || 'success',
        error_code: data.error_code,
        error_message: data.error_message,
        user_agent: data.user_agent,
        request_id: data.request_id,
      },
    });

    return this.mapRequestToEntity(result);
  }

  async findRequestById(id: string): Promise<AIRequest | null> {
    const data = await this.prisma.ai_requests.findUnique({
      where: { id },
    });
    return data ? this.mapRequestToEntity(data) : null;
  }

  // Performance stats 相关
  async getPerformanceStats(dateRange?: { start: string; end: string }): Promise<{
    stats: AIPerformanceStat[];
    totalCost: number;
    totalTokens: number;
    avgResponseTime: number;
  }> {
    const where: any = {};

    if (dateRange) {
      where.stat_date = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.stat_date = { gte: thirtyDaysAgo };
    }

    const data = await this.prisma.ai_performance_stats.findMany({
      where,
      orderBy: { stat_date: 'desc' },
    });

    const stats = data.map(this.mapPerformanceStatToEntity);
    const totalCost = stats.reduce((sum: number, stat: AIPerformanceStat) => sum + stat.estimated_cost, 0);
    const totalTokens = stats.reduce((sum: number, stat: AIPerformanceStat) => sum + stat.total_tokens, 0);
    const avgResponseTime = stats.length > 0
      ? stats.reduce((sum: number, stat: AIPerformanceStat) => sum + (stat.avg_response_time_ms || 0), 0) / stats.length
      : 0;

    return {
      stats,
      totalCost,
      totalTokens,
      avgResponseTime,
    };
  }

  // Template 相关
  async findTemplateById(id: string): Promise<any | null> {
    const data = await this.prisma.ai_feedback_templates.findFirst({
      where: { id, is_active: true },
    });
    return data;
  }

  async findTemplatesByFeature(featureType: AIFeatureType): Promise<any[]> {
    const data = await this.prisma.ai_feedback_templates.findMany({
      where: {
        feature_type: featureType,
        is_active: true,
      },
      orderBy: { name: 'asc' },
    });
    return data;
  }

  private mapFeedbackToEntity(row: any): AIFeedback {
    return {
      id: row.id,
      feature_type: row.feature_type as AIFeatureType,
      feedback_type: row.feedback_type as any,
      session_id: row.session_id,
      user_id: row.user_id,
      rating: row.rating,
      is_positive: row.is_positive,
      comment: row.comment,
      choices: row.choices,
      custom_data: row.custom_data as any,
      context: row.context as any,
      ai_request_id: row.ai_request_id,
      timestamp: row.timestamp?.toISOString() || new Date().toISOString(),
      user_agent: row.user_agent,
      client_version: row.client_version,
      tags: row.tags || [],
      priority: row.priority || 'medium',
      status: row.status || 'pending',
      admin_notes: row.admin_notes,
      resolved_at: row.resolved_at?.toISOString() || null,
      resolved_by: row.resolved_by,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
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
      input_data: row.input_data as any || {},
      parameters: row.parameters as any,
      prompt: row.prompt,
      response_data: row.response_data as any,
      response_text: row.response_text,
      tokens_used: row.tokens_used as any,
      response_time_ms: row.response_time_ms,
      status: row.status || 'success',
      error_code: row.error_code,
      error_message: row.error_message,
      timestamp: row.timestamp?.toISOString() || new Date().toISOString(),
      user_agent: row.user_agent,
      request_id: row.request_id,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    };
  }

  private mapPerformanceStatToEntity(row: any): AIPerformanceStat {
    return {
      id: row.id,
      stat_date: row.stat_date instanceof Date
        ? row.stat_date.toISOString().split('T')[0]
        : row.stat_date,
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
