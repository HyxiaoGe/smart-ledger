// 交易记录

export type Currency = 'CNY' | 'USD';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number; // 注意：前端以 number 处理，后端存储为 NUMERIC
  note?: string;
  date: string; // ISO 日期字符串，如 2025-10-04
  created_at?: string;
  currency?: Currency; // 允许记录币种，默认 CNY
  payment_method?: string; // 支付方式 ID，关联到 payment_methods 表
  // 新增优化字段
  merchant?: string; // 商家/品牌名称（如：瑞幸咖啡、地铁、美团）
  subcategory?: string; // 子分类（如：coffee、subway、takeout）
  product?: string; // 具体产品/服务（如：生椰拿铁、地铁票、午餐外卖）
}

// 常用备注类型定义（扩展支持智能分析）
export interface CommonNote {
  id: string;
  content: string; // 备注内容
  usage_count: number; // 使用次数
  last_used: string; // 最后使用时间 (ISO string)
  created_at: string; // 创建时间
  is_active: boolean; // 是否启用
  // 新增智能分析字段
  context_tags?: string[]; // 场景标签，如：['工作日', '午餐', '外卖']
  avg_amount?: number; // 平均金额
  time_patterns?: string[]; // 时间模式，如：['工作日12:00-13:00', '周末18:00-20:00']
  category_affinity?: string; // 类别关联度最强的类别
  // 新增优化字段
  merchant?: string; // 商家/品牌名称
  subcategory?: string; // 子分类
}

// 智能提示类型
export interface SmartSuggestion {
  id: string;
  content: string;
  type: 'frequency' | 'context' | 'pattern' | 'similarity';
  confidence: number; // 0-1 置信度
  reason: string; // 推荐理由
  source: string; // 数据来源说明
  metadata?: {
    avg_amount?: number;
    category?: string;
    time_context?: string;
    usage_count?: number;
  };
}

// 智能提示请求参数
export interface SmartSuggestionParams {
  category?: string;
  amount?: number;
  currency?: string;
  time_context?: string; // 当前时间上下文，如：'工作日午餐时间'
  partial_input?: string; // 用户已输入的部分内容
  limit?: number;
}

// 智能提示响应
export interface SmartSuggestionResponse {
  suggestions: SmartSuggestion[];
  fallback_notes: CommonNote[]; // 传统备注作为后备
}

// AI分析数据（用户无感知）
export interface NoteAnalytics {
  note_id: string;
  typical_amount?: number; // 常见金额
  preferred_time?: string; // 偏好使用时间
  confidence_score: number; // 分析置信度
  updated_at: string;
}
