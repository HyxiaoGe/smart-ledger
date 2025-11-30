/**
 * Prisma 模型类型定义
 * 基于 schema.prisma 手动创建，用于 Prisma Client 未正确生成时的类型支持
 */

import type { Decimal } from '@prisma/client/runtime/library';

// 基础模型类型
export interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: Decimal;
  note: string | null;
  date: Date;
  currency: string;
  created_at: Date;
  deleted_at: Date | null;
  recurring_expense_id: string | null;
  is_auto_generated: boolean | null;
  merchant: string | null;
  subcategory: string | null;
  product: string | null;
  payment_method: string | null;
}

export interface Category {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  color: string | null;
  type: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Subcategory {
  id: string;
  key: string;
  label: string;
  category_key: string;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface Budget {
  id: string;
  user_id: string | null;
  year: number;
  month: number;
  category_key: string | null;
  amount: Decimal;
  alert_threshold: Decimal | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentMethod {
  id: string;
  user_id: string | null;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  last_4_digits: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: Decimal;
  category: string;
  frequency: string;
  frequency_config: Record<string, unknown>;
  start_date: Date;
  end_date: Date | null;
  is_active: boolean | null;
  last_generated: Date | null;
  next_generate: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface RecurringGenerationLog {
  id: string;
  recurring_expense_id: string | null;
  generation_date: Date;
  generated_transaction_id: string | null;
  status: string | null;
  reason: string | null;
  created_at: Date | null;
}

export interface CommonNote {
  id: string;
  content: string;
  usage_count: number;
  last_used: Date;
  created_at: Date;
  is_active: boolean;
  context_tags: string[];
  avg_amount: Decimal | null;
  time_patterns: string[];
  category_affinity: string | null;
  merchant: string | null;
  subcategory: string | null;
}

export interface WeeklyReport {
  id: bigint;
  user_id: string | null;
  week_start_date: Date;
  week_end_date: Date;
  total_expenses: Decimal;
  transaction_count: number;
  average_transaction: Decimal | null;
  category_breakdown: Record<string, unknown> | null;
  top_merchants: Record<string, unknown> | null;
  payment_method_stats: Record<string, unknown> | null;
  week_over_week_change: Decimal | null;
  week_over_week_percentage: Decimal | null;
  ai_insights: string | null;
  generated_at: Date | null;
  generation_type: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface AIFeedback {
  id: string;
  feature_type: string;
  feedback_type: string;
  session_id: string | null;
  user_id: string | null;
  rating: number | null;
  is_positive: boolean | null;
  comment: string | null;
  choices: string[];
  custom_data: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
  ai_request_id: string | null;
  timestamp: Date | null;
  user_agent: string | null;
  client_version: string | null;
  ip_address: string | null;
  tags: string[];
  priority: string | null;
  status: string | null;
  admin_notes: string | null;
  resolved_at: Date | null;
  resolved_by: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface AIRequest {
  id: string;
  ai_provider: string;
  model_name: string | null;
  request_type: string;
  feature_type: string;
  session_id: string | null;
  user_id: string | null;
  input_data: Record<string, unknown>;
  parameters: Record<string, unknown> | null;
  prompt: string | null;
  response_data: Record<string, unknown> | null;
  response_text: string | null;
  tokens_used: Record<string, unknown> | null;
  response_time_ms: number | null;
  status: string | null;
  error_code: string | null;
  error_message: string | null;
  timestamp: Date | null;
  user_agent: string | null;
  ip_address: string | null;
  request_id: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface AIPerformanceStats {
  id: string;
  stat_date: Date;
  ai_provider: string;
  feature_type: string;
  model_name: string | null;
  total_requests: number | null;
  successful_requests: number | null;
  failed_requests: number | null;
  avg_response_time_ms: Decimal | null;
  min_response_time_ms: number | null;
  max_response_time_ms: number | null;
  p95_response_time_ms: number | null;
  total_tokens: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost: Decimal | null;
  error_rates: Record<string, unknown> | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface SystemLog {
  id: string;
  created_at: Date;
  level: string;
  category: string;
  trace_id: string | null;
  session_id: string | null;
  operation_id: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  ip_address: string | null;
  user_agent: string | null;
  message: string;
  error_code: string | null;
  error_stack: string | null;
  metadata: Record<string, unknown> | null;
  duration_ms: number | null;
}

// 导出所有类型
export type {
  Transaction as transactions,
  Category as categories,
  Subcategory as subcategories,
  Budget as budgets,
  PaymentMethod as payment_methods,
  RecurringExpense as recurring_expenses,
  RecurringGenerationLog as recurring_generation_logs,
  CommonNote as common_notes,
  WeeklyReport as weekly_reports,
  AIFeedback as ai_feedbacks,
  AIRequest as ai_requests,
  AIPerformanceStats as ai_performance_stats,
  SystemLog as system_logs,
};
