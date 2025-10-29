/**
 * AI反馈系统类型定义
 * 支持各种AI功能的统一反馈收集
 */

// AI功能类型
export type AIFeatureType =
  | 'spending_prediction'     // 支出预测
  | 'expense_classification'   // 支出分类
  | 'smart_analysis'         // 智能分析
  | 'budget_recommendation'   // 预算建议
  | 'anomaly_detection'      // 异常检测
  | 'trend_analysis'         // 趋势分析
  | 'deep_insight'           // 深度洞察
  | 'smart_suggestion'       // 智能建议
  | 'auto_categorization'    // 自动分类
  | 'chat_assistant'         // 对话助手
  | 'other';                 // 其他

// 反馈类型
export type FeedbackType =
  | 'rating'                  // 评分反馈
  | 'thumbs_up_down'          // 赞/踩反馈
  | 'text_comment'            // 文字评论
  | 'multiple_choice'         // 多选反馈
  | 'binary_choice'           // 二选一反馈
  | 'custom_form';            // 自定义表单

// 反馈数据结构
export interface AIFeedback {
  id: string;

  // 基本信息
  featureType: AIFeatureType;
  feedbackType: FeedbackType;
  sessionId: string;          // 用户会话ID
  userId?: string;            // 用户ID（如果支持登录）

  // 反馈内容
  rating?: number;            // 评分 (1-5)
  isPositive?: boolean;       // 赞/踩
  comment?: string;           // 文字评论
  choices?: string[];         // 多选答案
  customData?: Record<string, any>; // 自定义数据

  // 上下文信息
  context: {
    inputData?: any;          // AI输入数据
    outputData?: any;         // AI输出结果
    parameters?: Record<string, any>; // 参数设置
    userActions?: string[];   // 用户操作历史
    responseTime?: number;    // AI响应时间(ms)
  };

  // 元数据
  timestamp: string;          // 反馈时间
  userAgent?: string;         // 浏览器信息
  clientVersion?: string;     // 应用版本

  // 分析标记
  tags?: string[];            // 标签
  priority?: 'low' | 'medium' | 'high'; // 优先级
  status: 'pending' | 'reviewed' | 'resolved' | 'ignored'; // 处理状态

  // 管理信息
  adminNotes?: string;        // 管理员备注
  resolvedAt?: string;        // 解决时间
  resolvedBy?: string;        // 解决人
}

// 反馈统计数据
export interface AIFeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  positiveRate: number;

  // 按功能类型统计
  featureStats: Record<AIFeatureType, {
    count: number;
    avgRating: number;
    positiveRate: number;
  }>;

  // 按时间统计
  timeStats: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };

  // 最近反馈
  recentFeedbacks: AIFeedback[];

  // 情感分析
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// 反馈模板定义
export interface FeedbackTemplate {
  id: string;
  name: string;
  description: string;
  featureType: AIFeatureType;
  feedbackType: FeedbackType;

  // 模板配置
  config: {
    title?: string;              // 标题
    description?: string;        // 描述
    questions: FeedbackQuestion[];
    required?: boolean;          // 是否必填
    showAfterMs?: number;        // 延迟显示时间
    maxSubmissions?: number;     // 最大提交次数
  };

  // 显示配置
  display: {
    position: 'inline' | 'modal' | 'toast' | 'sidebar';
    autoShow?: boolean;
    persistent?: boolean;       // 是否持久显示
  };
}

// 反馈问题定义
export interface FeedbackQuestion {
  id: string;
  type: 'rating' | 'thumbs' | 'text' | 'choice' | 'checkbox';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];          // 选择题选项
  min?: number;                // 最小值/最小选项数
  max?: number;                // 最大值/最大选项数
}

// 反馈收集事件
export interface FeedbackCollectionEvent {
  featureType: AIFeatureType;
  trigger: 'auto' | 'manual' | 'scheduled';
  context: any;
  timestamp: string;
}

// 反馈分析结果
export interface FeedbackAnalysis {
  id: string;
  feedbackId: string;

  // AI分析结果
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;          // 分析置信度
  keywords: string[];          // 关键词提取

  // 分类标签
  categories: string[];
  severity?: 'low' | 'medium' | 'high';

  // 自动生成的建议
  suggestions: string[];

  // 分析元数据
  analyzedAt: string;
  analysisModel: string;
  processingTime: number;
}

// 反馈报告
export interface FeedbackReport {
  id: string;
  title: string;
  description: string;

  // 报告范围
  filters: {
    featureTypes?: AIFeatureType[];
    dateRange: {
      start: string;
      end: string;
    };
    status?: AIFeedback['status'][];
  };

  // 报告内容
  summary: {
    totalFeedbacks: number;
    overallRating: number;
    keyInsights: string[];
    trends: Array<{
      metric: string;
      change: number;
      direction: 'up' | 'down' | 'stable';
    }>;
  };

  // 详细数据
  detailedStats: AIFeedbackStats;
  topIssues: Array<{
    issue: string;
    count: number;
    severity: string;
  }>;

  recommendations: string[];

  // 报告元数据
  generatedAt: string;
  generatedBy: string;
  version: string;
}

// 反馈配置
export interface FeedbackConfig {
  enabled: boolean;

  // 收集策略
  collection: {
    autoTrigger: boolean;       // 自动触发
    triggerThreshold: number;   // 触发阈值
    maxPerSession: number;      // 每会话最大反馈数
    cooldownMinutes: number;     // 冷却时间
  };

  // 存储策略
  storage: {
    retentionDays: number;      // 数据保留天数
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };

  // 分析策略
  analysis: {
    autoAnalyze: boolean;       // 自动分析
    sentimentAnalysis: boolean; // 情感分析
    keywordExtraction: boolean; // 关键词提取
    categorization: boolean;    // 自动分类
  };

  // 通知策略
  notifications: {
    enabled: boolean;
    thresholds: {
      lowRating: number;        // 低评分阈值
      negativeCount: number;    // 负面反馈数量阈值
    };
    channels: ('email' | 'webhook' | 'in_app')[];
  };
}