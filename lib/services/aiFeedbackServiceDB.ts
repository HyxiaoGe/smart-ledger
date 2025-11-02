/**
 * AI反馈数据库服务
 * 使用Supabase数据库替代localStorage，提供企业级的数据管理
 */

import { supabase } from '@/lib/clients/supabase/client';
import { aiCacheService } from './aiCacheService';
import type {
  AIFeedbackRow,
  AIFeedbackInsert,
  AIFeedbackUpdate,
  AIRequestRow,
  AIRequestInsert,
  AIAnalysisRow,
  AIAnalysisInsert,
  AIPerformanceStatsRow,
  AIPerformanceStatsInsert
} from '@/types/database';
import type { AIFeatureType, FeedbackType } from '@/types/ai-feedback';

class AIFeedbackServiceDB {
  private static instance: AIFeedbackServiceDB;

  static getInstance(): AIFeedbackServiceDB {
    if (!AIFeedbackServiceDB.instance) {
      AIFeedbackServiceDB.instance = new AIFeedbackServiceDB();
    }
    return AIFeedbackServiceDB.instance;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建或获取会话
   */
  private async getOrCreateSession(): Promise<string> {
    const sessionId = this.generateSessionId();

    // 尝试创建新会话
    const { data, error } = await supabase
      .from('ai_sessions')
      .upsert({
        session_id: sessionId,
        start_time: new Date().toISOString(),
        context: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          timestamp: new Date().toISOString()
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error('创建AI会话失败:', error);
      throw new Error('创建AI会话失败');
    }

    return sessionId;
  }

  /**
   * 收集反馈
   */
  async collectFeedback(
    featureType: AIFeatureType,
    feedbackData: Partial<AIFeedbackInsert>
  ): Promise<string> {
    try {
      // 获取会话ID
      const sessionId = await this.getOrCreateSession();

      // 准备反馈数据
      const feedbackDataToInsert: AIFeedbackInsert = {
        feature_type: featureType,
        feedback_type: feedbackData.feedbackType || 'rating',
        session_id: sessionId,
        rating: feedbackData.rating,
        is_positive: feedbackData.isPositive,
        comment: feedbackData.comment,
        choices: feedbackData.choices,
        custom_data: feedbackData.customData,
        context: feedbackData.context || {},
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        client_version: '1.0.0',
        tags: feedbackData.tags || [],
        priority: feedbackData.priority || 'medium',
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('ai_feedbacks')
        .insert(feedbackDataToInsert)
        .select('id')
        .single();

      if (error) {
        console.error('保存AI反馈失败:', error);
        throw new Error('保存AI反馈失败');
      }

  
      // 触发异步分析（不等待完成）
      this.triggerAsyncAnalysis(data.id).catch(err => {
        console.error('异步分析失败:', err);
      });

      // 失效相关缓存
      aiCacheService.invalidatePattern(`.*feedback_stats.*`);
      aiCacheService.invalidatePattern(`.*ai_feedbacks.*`);

      return data.id;

    } catch (error) {
      console.error('收集AI反馈失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有反馈
   */
  async getAllFeedbacks(limit: number = 1000, offset: number = 0): Promise<AIFeedbackRow[]> {
    return aiCacheService.smartGet(
      'ai_feedbacks',
      { limit, offset },
      async () => {
        try {
          const { data, error } = await supabase
            .from('ai_feedbacks')
            .select('*')
            .order('timestamp', { ascending: false })
            .range(offset, offset + limit - 1);

          if (error) {
            console.error('获取AI反馈失败:', error);
            return [];
          }

          return data || [];
        } catch (error) {
          console.error('获取AI反馈失败:', error);
          return [];
        }
      }
    );
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

      // 应用筛选条件
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

      // 应用分页
      if (filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
      } else if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('筛选AI反馈失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('筛选AI反馈失败:', error);
      return [];
    }
  }

  /**
   * 获取反馈统计
   */
  async getFeedbackStats(): Promise<{
    totalFeedbacks: number;
    averageRating: number;
    positiveRate: number;
    featureStats: Record<string, {
      count: number;
      avgRating: number;
      positiveRate: number;
    }>;
    timeStats: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
    recentFeedbacks: AIFeedbackRow[];
    sentimentAnalysis: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }> {
    return aiCacheService.smartGet(
      'feedback_stats',
      {},
      async () => {
        try {
          const now = new Date();
          const today = now.toISOString().slice(0, 10);
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

          // 获取总体统计
          const { data: allFeedbacks, error } = await supabase
            .from('ai_feedbacks')
            .select('*');

          if (error || !allFeedbacks) {
            console.error('获取反馈统计失败:', error);
            return {
              totalFeedbacks: 0,
              averageRating: 0,
              positiveRate: 0,
              featureStats: {},
              timeStats: { today: 0, thisWeek: 0, thisMonth: 0 },
              recentFeedbacks: [],
              sentimentAnalysis: { positive: 0, neutral: 0, negative: 0 }
            };
          }

          // 计算总体统计
          const totalFeedbacks = allFeedbacks.length;
          const ratings = allFeedbacks.filter(f => f.rating !== null);
          const averageRating = ratings.length > 0
            ? ratings.reduce((sum, f) => sum + (f.rating || 0), 0) / ratings.length
            : 0;

          const positiveFeedbacks = allFeedbacks.filter(f => {
            if (f.is_positive !== null) return f.is_positive;
            if (f.rating !== null) return f.rating >= 4;
            return false;
          });
          const positiveRate = totalFeedbacks > 0 ? positiveFeedbacks.length / totalFeedbacks : 0;

          // 按功能类型统计
          const featureStats: Record<string, {
            count: number;
            avgRating: number;
            positiveRate: number;
          }> = {};

          const featureTypes = allFeedbacks.reduce((types, feedback) => {
            if (!types.includes(feedback.feature_type)) {
              types.push(feedback.feature_type);
            }
            return types;
          }, [] as string[]);

          featureTypes.forEach(type => {
            const typeFeedbacks = allFeedbacks.filter(f => f.feature_type === type);
            const typeRatings = typeFeedbacks.filter(f => f.rating !== null);
            const typePositive = typeFeedbacks.filter(f => {
              if (f.is_positive !== null) return f.is_positive;
              if (f.rating !== null) return f.rating >= 4;
              return false;
            });

            featureStats[type] = {
              count: typeFeedbacks.length,
              avgRating: typeRatings.length > 0
                ? typeRatings.reduce((sum, f) => sum + (f.rating || 0), 0) / typeRatings.length
                : 0,
              positiveRate: typeFeedbacks.length > 0 ? typePositive.length / typeFeedbacks.length : 0
            };
          });

          // 按时间统计
          const todayFeedbacks = allFeedbacks.filter(f =>
            f.timestamp.slice(0, 10) === today
          );
          const weekFeedbacks = allFeedbacks.filter(f =>
            f.timestamp >= weekAgo
          );
          const monthFeedbacks = allFeedbacks.filter(f =>
            f.timestamp >= monthAgo
          );

          // 情感分析（从AI分析表获取）
          const { data: analyses } = await supabase
            .from('ai_analyses')
            .select('sentiment');

          const sentimentAnalysis = analyses ? analyses.reduce((acc, analysis) => {
            acc[analysis.sentiment] = (acc[analysis.sentiment] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) : { positive: 0, neutral: 0, negative: 0 };

          // 最近反馈
          const recentFeedbacks = allFeedbacks
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);

          return {
            totalFeedbacks,
            averageRating: Math.round(averageRating * 10) / 10,
            positiveRate: Math.round(positiveRate * 100) / 100,
            featureStats,
            timeStats: {
              today: todayFeedbacks.length,
              thisWeek: weekFeedbacks.length,
              thisMonth: monthFeedbacks.length
            },
            recentFeedbacks,
            sentimentAnalysis
          };

        } catch (error) {
          console.error('获取反馈统计失败:', error);
          return {
            totalFeedbacks: 0,
            averageRating: 0,
            positiveRate: 0,
            featureStats: {},
            timeStats: { today: 0, thisWeek: 0, thisMonth: 0 },
            recentFeedbacks: [],
            sentimentAnalysis: { positive: 0, neutral: 0, negative: 0 }
          };
        }
      }
    );
  }

  /**
   * 更新反馈状态
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: AIFeedbackRow['status'],
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
        updates.resolved_by = null; // 在实际应用中，这里应该是当前用户ID
      }

      const { error } = await supabase
        .from('ai_feedbacks')
        .update(updates)
        .eq('id', feedbackId);

      if (error) {
        console.error('更新反馈状态失败:', error);
        throw new Error('更新反馈状态失败');
      }

    
    } catch (error) {
      console.error('更新AI反馈状态失败:', error);
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
        console.error('删除AI反馈失败:', error);
        throw new Error('删除AI反馈失败');
      }

      
    } catch (error) {
      console.error('删除AI反馈失败:', error);
      throw error;
    }
  }

  /**
   * 触发异步分析
   */
  private async triggerAsyncAnalysis(feedbackId: string): Promise<void> {
    try {
      // 简单的情感分析
      const { data: feedback } = await supabase
        .from('ai_feedbacks')
        .select('*')
        .eq('id', feedbackId)
        .single();

      if (!feedback) return;

      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
      let confidence = 0.5;

      if (feedback.rating) {
        if (feedback.rating >= 4) {
          sentiment = 'positive';
          confidence = 0.9;
        } else if (feedback.rating <= 2) {
          sentiment = 'negative';
          confidence = 0.9;
        } else {
          sentiment = 'neutral';
          confidence = 0.6;
        }
      }

      // 关键词提取（简单版本）
      const keywords: string[] = [];
      if (feedback.comment) {
        const comment = feedback.comment.toLowerCase();
        const positiveWords = ['好', '不错', '准确', '有用', '满意', '棒', '很好', '优秀'];
        const negativeWords = ['差', '不准', '无用', '失望', '糟糕', '问题', '错误', '失败'];

        positiveWords.forEach(word => {
          if (comment.includes(word)) {
            keywords.push(word);
            sentiment = 'positive';
            confidence = Math.min(confidence + 0.1, 0.9);
          }
        });

        negativeWords.forEach(word => {
          if (comment.includes(word)) {
            keywords.push(word);
            sentiment = 'negative';
            confidence = Math.min(confidence + 0.1, 0.9);
          }
        });
      }

      // 自动分类
      const categories: string[] = [];
      if (feedback.feature_type) {
        categories.push(feedback.feature_type);
      }
      if (sentiment === 'negative') {
        categories.push('improvement_needed');
      }
      if (keywords.length > 0) {
        categories.push('has_keywords');
      }

      // 生成建议
      const suggestions: string[] = [];
      if (sentiment === 'negative') {
        suggestions.push('建议重点关注用户的负面反馈');
        suggestions.push('分析负面反馈的根本原因');
      } else if (sentiment === 'positive') {
        suggestions.push('继续优化当前功能');
        suggestions.push('将正面反馈作为最佳实践');
      }

      // 保存分析结果
      const analysisData: AIAnalysisInsert = {
        feedback_id: feedbackId,
        sentiment,
        confidence,
        keywords,
        categories,
        severity: sentiment === 'negative' ? 'high' : sentiment === 'positive' ? 'low' : 'medium',
        suggestions,
        analysis_model: 'basic_rule_based',
        processing_time_ms: 10,
        version: '1.0'
      };

      await supabase
        .from('ai_analyses')
        .insert(analysisData);

      
    } catch (error) {
      console.error('异步分析失败:', error);
    }
  }

  /**
   * 导出反馈数据
   */
  async exportFeedbacks(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const feedbacks = await this.getAllFeedbacks(10000); // 导出最多10000条

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
      console.error('导出AI反馈失败:', error);
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
        .single();

      if (error) {
        console.error('获取反馈模板失败:', error);
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
        console.error('获取反馈模板失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取反馈模板失败:', error);
      return [];
    }
  }

  /**
   * 记录AI请求
   */
  async logAIRequest(
    aiProvider: string,
    modelName: string,
    featureType: string,
    requestType: string,
    inputData: any,
    prompt: string,
    responseData: any,
    responseTimeMs?: number,
    tokensUsed?: { input: number; output: number; total: number },
    status: 'success' | 'error' | 'timeout' | 'cancelled' = 'success',
    errorMessage?: string
  ): Promise<string> {
    try {
      const sessionId = await this.getOrCreateSession();

      const requestData: AIRequestInsert = {
        ai_provider: aiProvider,
        model_name: modelName,
        request_type: requestType,
        feature_type: featureType,
        session_id: sessionId,
        input_data: inputData,
        prompt,
        response_data: responseData,
        response_text: typeof responseData === 'string' ? responseData : JSON.stringify(responseData || ''),
        tokens_used: tokensUsed,
        response_time_ms: responseTimeMs,
        status,
        error_code: status === 'error' ? 'UNKNOWN_ERROR' : undefined,
        error_message: errorMessage,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const { data, error } = await supabase
        .from('ai_requests')
        .insert(requestData)
        .select('id')
        .single();

      if (error) {
        console.error('记录AI请求失败:', error);
        throw new Error('记录AI请求失败');
      }

      return data.id;

    } catch (error) {
      console.error('记录AI请求失败:', error);
      throw error;
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
        // 默认显示最近30天
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('stat_date', thirtyDaysAgo.toISOString().slice(0, 10));
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取性能统计失败:', error);
        return {
          stats: [],
          totalCost: 0,
          totalTokens: 0,
          avgResponseTime: 0
        };
      }

      // 计算汇总统计
      const stats = data || [];
      const totalCost = stats.reduce((sum, stat) => sum + (stat.estimated_cost || 0), 0);
      const totalTokens = stats.reduce((sum, stat) => sum + (stat.total_tokens || 0), 0);
      const avgResponseTime = stats.length > 0
        ? stats.reduce((sum, stat) => sum + (stat.avg_response_time_ms || 0), 0) / stats.length
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
}

// 导出单例实例
export const aiFeedbackServiceDB = AIFeedbackServiceDB.getInstance();