/**
 * AI反馈管理服务
 * 统一管理所有AI功能的用户反馈收集、存储和分析
 */

import {
  AIFeedback,
  AIFeedbackStats,
  AIFeatureType,
  FeedbackType,
  FeedbackTemplate,
  FeedbackAnalysis,
  FeedbackConfig,
  FeedbackCollectionEvent
} from '@/types/ai-feedback';

class AIFeedbackService {
  private static instance: AIFeedbackService;
  private readonly STORAGE_KEY = 'ai_feedbacks_v2';
  private readonly CONFIG_KEY = 'ai_feedback_config_v1';
  private readonly SESSION_KEY = 'ai_feedback_session_v1';
  private readonly ANALYSIS_KEY = 'ai_feedback_analysis_v1';

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

  // 反馈模板
  private templates: Map<string, FeedbackTemplate> = new Map();

  static getInstance(): AIFeedbackService {
    if (!AIFeedbackService.instance) {
      AIFeedbackService.instance = new AIFeedbackService();
      AIFeedbackService.instance.initializeTemplates();
      AIFeedbackService.instance.loadConfig();
    }
    return AIFeedbackService.instance;
  }

  /**
   * 初始化反馈模板
   */
  private initializeTemplates(): void {
    // 支出预测模板
    this.templates.set('spending_prediction_rating', {
      id: 'spending_prediction_rating',
      name: '支出预测评分',
      description: '对AI支出预测结果的准确性进行评分',
      featureType: 'spending_prediction',
      feedbackType: 'rating',
      config: {
        title: '预测结果准确吗？',
        description: '您的反馈将帮助我们改进预测算法',
        questions: [
          {
            id: 'accuracy',
            type: 'rating',
            label: '预测准确性',
            required: true,
            min: 1,
            max: 5
          },
          {
            id: 'helpfulness',
            type: 'rating',
            label: '预测有用性',
            required: true,
            min: 1,
            max: 5
          },
          {
            id: 'comment',
            type: 'text',
            label: '具体建议（可选）',
            placeholder: '请告诉我们如何改进...',
            required: false
          }
        ],
        required: true,
        showAfterMs: 5000,
        maxSubmissions: 1
      },
      display: {
        position: 'modal',
        autoShow: true,
        persistent: false
      }
    });

    // 智能分析模板
    this.templates.set('smart_analysis_thumbs', {
      id: 'smart_analysis_thumbs',
      name: '智能分析快速反馈',
      description: '对AI智能分析的快速反馈',
      featureType: 'smart_analysis',
      feedbackType: 'thumbs_up_down',
      config: {
        title: 'AI分析有用吗？',
        questions: [
          {
            id: 'helpful',
            type: 'thumbs',
            label: 'AI分析是否对您有帮助？',
            required: true
          },
          {
            id: 'comment',
            type: 'text',
            label: '详细反馈（可选）',
            required: false
          }
        ],
        required: false,
        showAfterMs: 3000
      },
      display: {
        position: 'toast',
        autoShow: true,
        persistent: false
      }
    });

    // 支出分类模板
    this.templates.set('auto_categorization_feedback', {
      id: 'auto_categorization_feedback',
      name: '自动分类反馈',
      description: '对AI自动分类的反馈',
      featureType: 'auto_categorization',
      feedbackType: 'binary_choice',
      config: {
        title: '分类正确吗？',
        questions: [
          {
            id: 'correct',
            type: 'thumbs',
            label: 'AI自动分类是否正确？',
            required: true
          }
        ],
        required: false
      },
      display: {
        position: 'inline',
        autoShow: false,
        persistent: true
      }
    });
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem(this.CONFIG_KEY);
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('加载AI反馈配置失败:', error);
    }
  }

  /**
   * 保存配置
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('保存AI反馈配置失败:', error);
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    const existing = localStorage.getItem(this.SESSION_KEY);
    if (existing) {
      const sessionData = JSON.parse(existing);
      const lastActivity = new Date(sessionData.lastActivity).getTime();
      const now = Date.now();

      // 如果会话仍然活跃（30分钟内）
      if (now - lastActivity < 30 * 60 * 1000) {
        sessionData.lastActivity = new Date().toISOString();
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
        return sessionData.sessionId;
      }
    }

    // 创建新会话
    const newSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      feedbackCount: 0
    };

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(newSession));
    return newSession.sessionId;
  }

  /**
   * 检查是否可以收集反馈
   */
  private canCollectFeedback(featureType: AIFeatureType): boolean {
    if (!this.config.enabled) return false;

    const sessionData = JSON.parse(localStorage.getItem(this.SESSION_KEY) || '{}');

    // 检查会话反馈数量限制
    if (sessionData.feedbackCount >= this.config.collection.maxPerSession) {
      return false;
    }

    // 检查冷却时间
    const lastFeedbackKey = `last_feedback_${featureType}`;
    const lastFeedbackTime = localStorage.getItem(lastFeedbackKey);
    if (lastFeedbackTime) {
      const lastTime = new Date(lastFeedbackTime).getTime();
      const now = Date.now();
      const cooldownMs = this.config.collection.cooldownMinutes * 60 * 1000;

      if (now - lastTime < cooldownMs) {
        return false;
      }
    }

    return true;
  }

  /**
   * 收集反馈
   */
  async collectFeedback(
    featureType: AIFeatureType,
    feedbackData: Partial<AIFeedback>
  ): Promise<string> {
    if (!this.canCollectFeedback(featureType)) {
      throw new Error('反馈收集未达到条件或已达到限制');
    }

    const sessionId = this.generateSessionId();
    const feedback: AIFeedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      featureType,
      feedbackType: feedbackData.feedbackType || 'rating',
      sessionId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      clientVersion: '1.0.0',
      status: 'pending',
      context: feedbackData.context || {},
      ...feedbackData
    };

    // 保存反馈
    await this.saveFeedback(feedback);

    // 更新会话计数
    const sessionData = JSON.parse(localStorage.getItem(this.SESSION_KEY) || '{}');
    sessionData.feedbackCount = (sessionData.feedbackCount || 0) + 1;
    sessionData.lastActivity = new Date().toISOString();
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));

    // 记录最后反馈时间
    const lastFeedbackKey = `last_feedback_${featureType}`;
    localStorage.setItem(lastFeedbackKey, new Date().toISOString());

    // 自动分析（如果启用）
    if (this.config.analysis.autoAnalyze) {
      this.analyzeFeedback(feedback);
    }

    // 触发通知（如果需要）
    this.checkNotificationThresholds(feedback);

    console.log('✅ AI反馈已收集:', feedback.id);
    return feedback.id;
  }

  /**
   * 保存反馈到本地存储
   */
  private async saveFeedback(feedback: AIFeedback): Promise<void> {
    try {
      const feedbacks = this.getAllFeedbacks();
      feedbacks.push(feedback);

      // 限制存储数量，保留最近的1000条
      if (feedbacks.length > 1000) {
        feedbacks.splice(0, feedbacks.length - 1000);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(feedbacks));

      // 清理过期数据
      this.cleanupExpiredFeedbacks();

    } catch (error) {
      console.error('保存AI反馈失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有反馈
   */
  getAllFeedbacks(): AIFeedback[] {
    try {
      const feedbacks = localStorage.getItem(this.STORAGE_KEY);
      return feedbacks ? JSON.parse(feedbacks) : [];
    } catch (error) {
      console.error('读取AI反馈失败:', error);
      return [];
    }
  }

  /**
   * 根据条件筛选反馈
   */
  getFilteredFeedbacks(filters: {
    featureType?: AIFeatureType;
    status?: AIFeedback['status'];
    dateRange?: { start: string; end: string };
    rating?: { min?: number; max?: number };
  } = {}): AIFeedback[] {
    let feedbacks = this.getAllFeedbacks();

    if (filters.featureType) {
      feedbacks = feedbacks.filter(f => f.featureType === filters.featureType);
    }

    if (filters.status) {
      feedbacks = feedbacks.filter(f => f.status === filters.status);
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      feedbacks = feedbacks.filter(f => {
        const date = new Date(f.timestamp);
        return date >= start && date <= end;
      });
    }

    if (filters.rating) {
      feedbacks = feedbacks.filter(f => {
        if (!f.rating) return false;
        const min = filters.rating.min || 0;
        const max = filters.rating.max || 5;
        return f.rating >= min && f.rating <= max;
      });
    }

    return feedbacks;
  }

  /**
   * 获取反馈统计
   */
  getFeedbackStats(): AIFeedbackStats {
    const feedbacks = this.getAllFeedbacks();
    const now = new Date();

    // 总体统计
    const totalFeedbacks = feedbacks.length;
    const ratings = feedbacks.filter(f => f.rating !== undefined);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, f) => sum + (f.rating || 0), 0) / ratings.length
      : 0;

    const positiveFeedbacks = feedbacks.filter(f => {
      if (f.isPositive !== undefined) return f.isPositive;
      if (f.rating !== undefined) return f.rating >= 4;
      return false;
    });
    const positiveRate = totalFeedbacks > 0 ? positiveFeedbacks.length / totalFeedbacks : 0;

    // 按功能类型统计
    const featureTypes: AIFeatureType[] = [
      'spending_prediction', 'expense_classification', 'smart_analysis',
      'budget_recommendation', 'anomaly_detection', 'trend_analysis',
      'deep_insight', 'smart_suggestion', 'auto_categorization', 'chat_assistant', 'other'
    ];

    const featureStats: Record<AIFeatureType, {
      count: number;
      avgRating: number;
      positiveRate: number;
    }> = {} as any;

    featureTypes.forEach(type => {
      const typeFeedbacks = feedbacks.filter(f => f.featureType === type);
      const typeRatings = typeFeedbacks.filter(f => f.rating !== undefined);
      const typePositive = typeFeedbacks.filter(f => {
        if (f.isPositive !== undefined) return f.isPositive;
        if (f.rating !== undefined) return f.rating >= 4;
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
    const todayFeedbacks = feedbacks.filter(f => {
      const feedbackDate = new Date(f.timestamp);
      return feedbackDate.toDateString() === now.toDateString();
    });

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekFeedbacks = feedbacks.filter(f => {
      const feedbackDate = new Date(f.timestamp);
      return feedbackDate >= weekAgo;
    });

    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthFeedbacks = feedbacks.filter(f => {
      const feedbackDate = new Date(f.timestamp);
      return feedbackDate >= monthAgo;
    });

    // 情感分析
    const sentimentAnalysis = {
      positive: positiveFeedbacks.length,
      neutral: feedbacks.filter(f => {
        if (f.isPositive !== undefined) return f.isPositive === false && f.rating && f.rating >= 3;
        return false;
      }).length,
      negative: feedbacks.filter(f => {
        if (f.isPositive !== undefined) return f.isPositive === false;
        if (f.rating !== undefined) return f.rating <= 2;
        return false;
      }).length
    };

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
      recentFeedbacks: feedbacks.slice(-10),
      sentimentAnalysis
    };
  }

  /**
   * 分析反馈
   */
  private async analyzeFeedback(feedback: AIFeedback): Promise<void> {
    try {
      // 简单的情感分析
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
        const positiveWords = ['好', '不错', '准确', '有用', '满意', '棒', '很好'];
        const negativeWords = ['差', '不准', '无用', '失望', '糟糕', '问题', '错误'];

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
      if (feedback.featureType) {
        categories.push(feedback.featureType);
      }
      if (sentiment === 'negative') {
        categories.push('improvement_needed');
      }
      if (keywords.length > 0) {
        categories.push('has_keywords');
      }

      const analysis: FeedbackAnalysis = {
        id: `analysis_${feedback.id}`,
        feedbackId: feedback.id,
        sentiment,
        confidence,
        keywords,
        categories,
        analyzedAt: new Date().toISOString(),
        analysisModel: 'basic_rule_based',
        processingTime: 10
      };

      // 保存分析结果
      this.saveAnalysis(analysis);

    } catch (error) {
      console.error('分析AI反馈失败:', error);
    }
  }

  /**
   * 保存分析结果
   */
  private saveAnalysis(analysis: FeedbackAnalysis): void {
    try {
      const analyses = this.getAllAnalyses();
      analyses.push(analysis);

      // 限制存储数量
      if (analyses.length > 500) {
        analyses.splice(0, analyses.length - 500);
      }

      localStorage.setItem(this.ANALYSIS_KEY, JSON.stringify(analyses));
    } catch (error) {
      console.error('保存AI反馈分析失败:', error);
    }
  }

  /**
   * 获取所有分析结果
   */
  getAllAnalyses(): FeedbackAnalysis[] {
    try {
      const analyses = localStorage.getItem(this.ANALYSIS_KEY);
      return analyses ? JSON.parse(analyses) : [];
    } catch (error) {
      console.error('读取AI反馈分析失败:', error);
      return [];
    }
  }

  /**
   * 检查通知阈值
   */
  private checkNotificationThresholds(feedback: AIFeedback): void {
    if (!this.config.notifications.enabled) return;

    // 检查低评分阈值
    if (feedback.rating && feedback.rating <= this.config.notifications.thresholds.lowRating) {
      this.triggerNotification('low_rating', feedback);
    }

    // 检查负面反馈数量
    const negativeCount = this.getFilteredFeedbacks({
      dateRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    }).filter(f => {
      if (f.isPositive !== undefined) return f.isPositive === false;
      if (f.rating !== undefined) return f.rating <= 2;
      return false;
    }).length;

    if (negativeCount >= this.config.notifications.thresholds.negativeCount) {
      this.triggerNotification('negative_feedback_spike', feedback);
    }
  }

  /**
   * 触发通知
   */
  private triggerNotification(type: string, feedback: AIFeedback): void {
    console.log(`🔔 AI反馈通知: ${type}`, feedback);
    // 这里可以集成实际的通知系统
  }

  /**
   * 清理过期反馈
   */
  private cleanupExpiredFeedbacks(): void {
    const retentionMs = this.config.storage.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - retentionMs);

    const feedbacks = this.getAllFeedbacks();
    const validFeedbacks = feedbacks.filter(f => {
      const feedbackDate = new Date(f.timestamp);
      return feedbackDate >= cutoffDate;
    });

    if (validFeedbacks.length !== feedbacks.length) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validFeedbacks));
      console.log(`🧹 清理了 ${feedbacks.length - validFeedbacks.length} 条过期AI反馈`);
    }
  }

  /**
   * 获取反馈模板
   */
  getTemplate(templateId: string): FeedbackTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * 获取功能类型的所有模板
   */
  getTemplatesByFeature(featureType: AIFeatureType): FeedbackTemplate[] {
    return Array.from(this.templates.values()).filter(
      template => template.featureType === featureType
    );
  }

  /**
   * 更新反馈状态
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: AIFeedback['status'],
    adminNotes?: string
  ): Promise<void> {
    try {
      const feedbacks = this.getAllFeedbacks();
      const feedbackIndex = feedbacks.findIndex(f => f.id === feedbackId);

      if (feedbackIndex !== -1) {
        feedbacks[feedbackIndex].status = status;
        feedbacks[feedbackIndex].adminNotes = adminNotes;
        feedbacks[feedbackIndex].resolvedAt = adminNotes ? new Date().toISOString() : undefined;

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(feedbacks));
        console.log(`✅ AI反馈状态已更新: ${feedbackId} -> ${status}`);
      }
    } catch (error) {
      console.error('更新AI反馈状态失败:', error);
      throw error;
    }
  }

  /**
   * 导出反馈数据
   */
  exportFeedbacks(format: 'json' | 'csv' = 'json'): string {
    const feedbacks = this.getAllFeedbacks();

    if (format === 'csv') {
      const headers = ['ID', '功能类型', '反馈类型', '评分', '评论', '时间', '状态'];
      const rows = feedbacks.map(f => [
        f.id,
        f.featureType,
        f.feedbackType,
        f.rating || '',
        f.comment || '',
        f.timestamp,
        f.status
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(feedbacks, null, 2);
  }

  /**
   * 获取配置
   */
  getConfig(): FeedbackConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<FeedbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }
}

// 导出单例实例
export const aiFeedbackService = AIFeedbackService.getInstance();