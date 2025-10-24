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
}

// 常用备注类型定义
export interface CommonNote {
  id: string;
  content: string; // 备注内容
  usage_count: number; // 使用次数
  last_used: string; // 最后使用时间 (ISO string)
  created_at: string; // 创建时间
  is_active: boolean; // 是否启用
}

// AI分析数据（用户无感知）
export interface NoteAnalytics {
  note_id: string;
  typical_amount?: number; // 常见金额
  preferred_time?: string; // 偏好使用时间
  confidence_score: number; // 分析置信度
  updated_at: string;
}
