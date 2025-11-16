/**
 * 统一 AI 反馈服务
 * 整合数据库和本地存储，提供统一的反馈管理接口
 *
 * 架构：
 * - 优先使用 Supabase 数据库（持久化、可分析）
 * - 降级到 localStorage（离线场景）
 * - 使用统一缓存系统
 */

import { supabase } from '@/lib/clients/supabase/client';
import { memoryCache } from '@/lib/infrastructure/cache';
import type {
  AIFeedback,
  AIFeedbackStats,
  AIFeatureType,
  FeedbackType,
  FeedbackTemplate,
  FeedbackConfig
} from '@/types/ai-feedback';
import type {
  AIFeedbackInsert,
  AIFeedbackRow,
  AIFeedbackUpdate,
  AIRequestInsert
} from '@/types/database';

/**
 * AI 反馈服务
 */
export class AIFeedbackService {
  private static instance: AIFeedbackService;
  private readonly STORAGE_KEY = 'ai_feedbacks_v2';
  private readonly SESSION_KEY = 'ai_feedback_session_v1';
  private readonly SYNCED_IDS_KEY = 'ai_synced_ids_v1';

  // 配置
  private config: FeedbackConfig = {
    enabled: true,
    collection: {
      autoTrigger: true,
      triggerThreshold: 3,
      maxPerSession: 5,
      cooldownMinutes: 5
    },
    storage: {
      retentionDays: 90,
      compressionEnabled: true,
      encryptionEnabled: false
    },
    analysis: {
      autoAnalyze: true,
      sentimentAnalysis: true,
      keywordExtraction: true,
      categorization: true
    },
    notifications: {
      enabled: false,
      thresholds: {
        lowRating: 2,
        negativeCount: 5
      },
      channels: ['in_app']
    }
  };

  static getInstance(): AIFeedbackService {
    if (!AIFeedbackService.instance) {
      AIFeedbackService.instance = new AIFeedbackService();
    }
    return AIFeedbackService.instance;
  }

  /**
   * 收集反馈（优先数据库，降级 localStorage）
   */
  async collectFeedback(
    featureType: AIFeatureType,
    feedbackType: FeedbackType,
    data: Partial<AIFeedbackInsert>
  ): Promise<string> {
    try {
      // 尝试保存到数据库
      return await this.saveFeedbackToDB(featureType, feedbackType, data);
    } catch (error) {
      console.warn('数据库保存失败，降级到 localStorage:', error);
      // 降级到 localStorage
      return this.saveFeedbackToLocal(featureType, feedbackType, data);
    }
  }

  /**
   * 保存反馈到数据库
   */
  private async saveFeedbackToDB(
    featureType: AIFeatureType,
    feedbackType: FeedbackType,
    data: Partial<AIFeedbackInsert>
  ): Promise<string> {
    const sessionId = this.getOrCreateSessionId();

    const feedbackData: AIFeedbackInsert = {
      feature_type: featureType,
      feedback_type: feedbackType,
      session_id: sessionId,
      rating: data.rating,
      is_positive: data.is_positive,
      comment: data.comment,
      choices: data.choices,
      custom_data: data.custom_data,
      context: data.context || {},
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      client_version: '1.0.0',
      tags: data.tags || [],
      priority: data.priority || 'medium',
      status: 'pending'
    };

    const { data: result, error } = await supabase
      .from('ai_feedbacks')
      .insert(feedbackData)
      .select('id')
      .single();

    if (error) {
      throw new Error(`保存反馈失败: ${error.message}`);
    }

    return result!.id;
  }

  /**
   * 保存反馈到 localStorage（降级方案）
   */
  private saveFeedbackToLocal(
    featureType: AIFeatureType,
    feedbackType: FeedbackType,
    data: Partial<AIFeedbackInsert>
  ): string {
    if (typeof window === 'undefined') {
      throw new Error('localStorage 不可用');
    }

    const feedbackId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const feedback: AIFeedback = {
      id: feedbackId,
      featureType,
      feedbackType,
      sessionId: this.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      rating: data.rating,
      isPositive: data.is_positive,
      comment: data.comment,
      choices: data.choices as string[] | undefined,
      customData: data.custom_data,
      context: data.context || {},
      userAgent: navigator.userAgent,
      status: 'pending'
    };

    const feedbacks = this.getFeedbacksFromLocal();
    feedbacks.push(feedback);

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(feedbacks));
    } catch (error) {
      console.error('localStorage 保存失败:', error);
    }

    return feedbackId;
  }

  /**
   * 获取反馈统计（优先数据库）
   */
  async getFeedbackStats(
    featureType?: AIFeatureType,
    days: number = 30
  ): Promise<AIFeedbackStats> {
    const cacheKey = `feedback-stats:${featureType || 'all'}:${days}`;

    // 检查缓存
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      return cached as AIFeedbackStats;
    }

    try {
      // 从数据库获取
      const stats = await this.getStatsFromDB(featureType, days);

      // 缓存 5 分钟
      memoryCache.set(cacheKey, stats, { ttl: 5 * 60 * 1000, tags: ['ai-feedback'] });

      return stats;
    } catch (error) {
      console.warn('数据库统计失败，使用 localStorage:', error);
      return this.getStatsFromLocal(featureType, days);
    }
  }

  /**
   * 从数据库获取统计
   */
  private async getStatsFromDB(
    featureType?: AIFeatureType,
    days: number = 30
  ): Promise<AIFeedbackStats> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    let query = supabase
      .from('ai_feedbacks')
      .select('*')
      .gte('created_at', sinceDate.toISOString());

    if (featureType) {
      query = query.eq('feature_type', featureType);
    }

    const { data: feedbacks, error } = await query;

    if (error) {
      throw new Error(`获取反馈统计失败: ${error.message}`);
    }

    return this.calculateStats(feedbacks || [], featureType);
  }

  /**
   * 从 localStorage 获取统计
   */
  private getStatsFromLocal(
    featureType?: AIFeatureType,
    days: number = 30
  ): AIFeedbackStats {
    const feedbacks = this.getFeedbacksFromLocal();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filtered = feedbacks.filter(f => {
      const feedbackDate = new Date(f.timestamp);
      return feedbackDate >= cutoffDate &&
        (!featureType || f.featureType === featureType);
    });

    return this.calculateStats(filtered, featureType);
  }

  /**
   * 计算统计数据
   */
  private calculateStats(feedbacks: any[], featureType?: AIFeatureType): AIFeedbackStats {
    const total = feedbacks.length;
    const positive = feedbacks.filter(f => f.is_positive === true || f.isPositive === true).length;
    const negative = feedbacks.filter(f => f.is_positive === false || f.isPositive === false).length;
    const ratings = feedbacks.filter(f => f.rating != null).map(f => f.rating as number);
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
      featureStats: {} as any,
      timeStats: {
        today: feedbacks.filter(f => f.timestamp.slice(0, 10) === today).length,
        thisWeek: feedbacks.filter(f => f.timestamp >= weekAgo).length,
        thisMonth: feedbacks.filter(f => f.timestamp >= monthAgo).length
      },
      recentFeedbacks: feedbacks.slice(-10),
      sentimentAnalysis: {
        positive,
        neutral: total - positive - negative,
        negative
      }
    };
  }

  /**
   * 记录 AI 请求
   */
  async logAIRequest(
    aiProvider: string,
    modelName: string,
    featureType: string,
    requestType: string,
    inputData: any,
    prompt: string,
    responseData: any,
    responseTimeMs: number,
    tokensUsed?: { input: number; output: number; total: number },
    status: 'success' | 'error' | 'timeout' | 'cancelled' = 'success',
    errorMessage?: string
  ): Promise<string> {
    try {
      const requestData: AIRequestInsert = {
        ai_provider: aiProvider,
        model_name: modelName,
        feature_type: featureType,
        request_type: requestType,
        input_data: inputData,
        prompt,
        response_data: responseData,
        response_time_ms: responseTimeMs,
        tokens_used: tokensUsed ? {
          input: tokensUsed.input,
          output: tokensUsed.output,
          total: tokensUsed.total
        } : null,
        status,
        error_message: errorMessage,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      };

      const { data, error } = await supabase
        .from('ai_requests')
        .insert(requestData)
        .select('id')
        .single();

      if (error) {
        throw new Error(`记录 AI 请求失败: ${error.message}`);
      }

      return data!.id;
    } catch (error) {
      console.error('记录 AI 请求失败:', error);
      // 失败不影响主流程
      return '';
    }
  }

  /**
   * 获取或创建会话 ID
   */
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') {
      return `server_session_${Date.now()}`;
    }

    let sessionId = localStorage.getItem(this.SESSION_KEY);

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(this.SESSION_KEY, sessionId);
    }

    return sessionId;
  }

  /**
   * 从 localStorage 获取反馈列表
   */
  private getFeedbacksFromLocal(): AIFeedback[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('读取本地反馈失败:', error);
      return [];
    }
  }

  /**
   * 同步本地反馈到数据库
   */
  async syncLocalFeedbacksToDB(): Promise<number> {
    if (typeof window === 'undefined') {
      return 0;
    }

    const syncedIds = JSON.parse(localStorage.getItem(this.SYNCED_IDS_KEY) || '[]') as string[];
    const localFeedbacks = this.getFeedbacksFromLocal().filter(f => !syncedIds.includes(f.id));

    if (localFeedbacks.length === 0) {
      return 0;
    }

    let syncedCount = 0;

    for (const feedback of localFeedbacks) {
      try {
        await this.saveFeedbackToDB(
          feedback.featureType,
          feedback.feedbackType,
          {
            rating: feedback.rating,
            is_positive: feedback.isPositive,
            comment: feedback.comment,
            choices: feedback.choices,
            custom_data: feedback.customData,
            context: feedback.context
          }
        );

        syncedIds.push(feedback.id);
        syncedCount++;
      } catch (error) {
        console.error('同步反馈失败:', error);
      }
    }

    // 更新 localStorage
    if (syncedCount > 0) {
      localStorage.setItem(this.SYNCED_IDS_KEY, JSON.stringify(syncedIds));
    }

    return syncedCount;
  }

  /**
   * 获取所有反馈（带分页）
   */
  async getAllFeedbacks(limit: number = 1000, offset: number = 0): Promise<AIFeedbackRow[]> {
    try {
      const { data, error } = await supabase
        .from('ai_feedbacks')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.warn('从数据库获取反馈失败，返回空数组:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取反馈失败:', error);
      return [];
    }
  }

  /**
   * 根据条件筛选反馈
   */
  async getFilteredFeedbacks(filters: {
    featureType?: AIFeatureType;
    status?: string;
    dateRange?: { start: string; end: string };
    rating?: { min?: number; max?: number };
    limit?: number;
    offset?: number;
  } = {}): Promise<AIFeedbackRow[]> {
    try {
      let query = supabase
        .from('ai_feedbacks')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters.featureType) {
        query = query.eq('feature_type', filters.featureType);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.dateRange) {
        query = query
          .gte('timestamp', filters.dateRange.start)
          .lte('timestamp', filters.dateRange.end);
      }
      if (filters.rating) {
        if (filters.rating.min !== undefined) {
          query = query.gte('rating', filters.rating.min);
        }
        if (filters.rating.max !== undefined) {
          query = query.lte('rating', filters.rating.max);
        }
      }

      if (filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
      } else if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('筛选反馈失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('筛选反馈失败:', error);
      return [];
    }
  }

  /**
   * 更新反馈状态
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: 'pending' | 'reviewed' | 'resolved' | 'archived',
    adminNotes?: string
  ): Promise<void> {
    try {
      const updates: AIFeedbackUpdate = {
        status,
        updated_at: new Date().toISOString()
      };

      if (adminNotes) {
        updates.admin_notes = adminNotes;
      }

      if (status === 'resolved' || status === 'reviewed') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ai_feedbacks')
        .update(updates)
        .eq('id', feedbackId);

      if (error) {
        throw new Error(`更新反馈状态失败: ${error.message}`);
      }

      this.clearCache();
    } catch (error) {
      console.error('更新反馈状态失败:', error);
      throw error;
    }
  }

  /**
   * 删除反馈
   */
  async deleteFeedback(feedbackId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_feedbacks')
        .delete()
        .eq('id', feedbackId);

      if (error) {
        throw new Error(`删除反馈失败: ${error.message}`);
      }

      this.clearCache();
    } catch (error) {
      console.error('删除反馈失败:', error);
      throw error;
    }
  }

  /**
   * 导出反馈数据
   */
  async exportFeedbacks(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const feedbacks = await this.getAllFeedbacks(10000);

      if (format === 'csv') {
        const headers = [
          'ID', '功能类型', '反馈类型', '评分', '是否积极', '评论',
          '状态', '优先级', '标签', '时间', '创建时间'
        ];

        const rows = feedbacks.map(f => [
          f.id,
          f.feature_type,
          f.feedback_type,
          f.rating || '',
          f.is_positive !== null ? (f.is_positive ? '是' : '否') : '',
          f.comment || '',
          f.status,
          f.priority || '',
          (f.tags || []).join(';'),
          f.timestamp,
          f.created_at
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
      }

      return JSON.stringify(feedbacks, null, 2);
    } catch (error) {
      console.error('导出反馈失败:', error);
      throw error;
    }
  }

  /**
   * 获取反馈模板
   */
  async getTemplate(templateId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('ai_feedback_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.warn('获取反馈模板失败:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('获取反馈模板失败:', error);
      return null;
    }
  }

  /**
   * 获取功能类型的所有模板
   */
  async getTemplatesByFeature(featureType: AIFeatureType): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ai_feedback_templates')
        .select('*')
        .eq('feature_type', featureType)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.warn('获取反馈模板失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取反馈模板失败:', error);
      return [];
    }
  }

  /**
   * 获取性能统计
   */
  async getPerformanceStats(dateRange?: { start: string; end: string }): Promise<any> {
    try {
      let query = supabase
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

      if (error) {
        console.warn('获取性能统计失败:', error);
        return {
          stats: [],
          totalCost: 0,
          totalTokens: 0,
          avgResponseTime: 0
        };
      }

      const stats = data || [];
      const totalCost = stats.reduce((sum: number, stat: any) => sum + (stat.estimated_cost || 0), 0);
      const totalTokens = stats.reduce((sum: number, stat: any) => sum + (stat.total_tokens || 0), 0);
      const avgResponseTime = stats.length > 0
        ? stats.reduce((sum: number, stat: any) => sum + (stat.avg_response_time_ms || 0), 0) / stats.length
        : 0;

      return {
        stats,
        totalCost,
        totalTokens,
        avgResponseTime,
        period: dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          end: new Date().toISOString().slice(0, 10)
        }
      };
    } catch (error) {
      console.error('获取性能统计失败:', error);
      return {
        stats: [],
        totalCost: 0,
        totalTokens: 0,
        avgResponseTime: 0
      };
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    memoryCache.invalidateByTag('ai-feedback');
  }
}

// 导出单例
export const aiFeedbackService = AIFeedbackService.getInstance();

// 便捷函数
export async function collectAIFeedback(
  featureType: AIFeatureType,
  feedbackType: FeedbackType,
  data: Partial<AIFeedbackInsert>
): Promise<string> {
  return aiFeedbackService.collectFeedback(featureType, feedbackType, data);
}

export async function getAIFeedbackStats(
  featureType?: AIFeatureType,
  days: number = 30
): Promise<AIFeedbackStats> {
  return aiFeedbackService.getFeedbackStats(featureType, days);
}

export async function logAIRequest(
  aiProvider: string,
  modelName: string,
  featureType: string,
  requestType: string,
  inputData: any,
  prompt: string,
  responseData: any,
  responseTimeMs: number,
  tokensUsed?: { input: number; output: number; total: number },
  status?: 'success' | 'error' | 'timeout' | 'cancelled',
  errorMessage?: string
): Promise<string> {
  return aiFeedbackService.logAIRequest(
    aiProvider,
    modelName,
    featureType,
    requestType,
    inputData,
    prompt,
    responseData,
    responseTimeMs,
    tokensUsed,
    status,
    errorMessage
  );
}
