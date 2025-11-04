import { supabase } from '@/lib/clients/supabase/client';

/**
 * 支付方式定义
 */
export interface PaymentMethod {
  id: string;
  user_id: string | null;
  name: string;
  type: 'credit_card' | 'debit_card' | 'alipay' | 'wechat' | 'cash' | 'other';
  icon: string | null;
  color: string | null;
  last_4_digits: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  usage_count?: number;
  last_used?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 支付方式使用详情
 */
export interface PaymentMethodUsageDetail {
  total_transactions: number;
  total_amount: number;
  avg_amount: number;
  last_used: string | null;
  most_used_category: string | null;
  most_used_category_count: number;
}

/**
 * 删除结果
 */
export interface DeletePaymentMethodResult {
  success: boolean;
  message: string;
  transaction_count: number;
}

/**
 * 支付方式类型配置
 * iconType: 'lucide' 使用 Lucide 图标, 'emoji' 使用 emoji
 */
export const PAYMENT_METHOD_TYPES = [
  { value: 'alipay', label: '支付宝', icon: 'Wallet', iconType: 'lucide' as const, color: '#1677FF', brandColor: true },
  { value: 'wechat', label: '微信支付', icon: 'MessageCircle', iconType: 'lucide' as const, color: '#07C160', brandColor: true },
  { value: 'cash', label: '现金', icon: 'Banknote', iconType: 'lucide' as const, color: '#10B981', brandColor: false },
  { value: 'debit_card', label: '借记卡', icon: 'CreditCard', iconType: 'lucide' as const, color: '#6366F1', brandColor: false },
  { value: 'credit_card', label: '信用卡', icon: 'CreditCard', iconType: 'lucide' as const, color: '#EC4899', brandColor: false },
  { value: 'other', label: '其他', icon: 'Smartphone', iconType: 'lucide' as const, color: '#8B5CF6', brandColor: false },
] as const;

/**
 * 常用图标
 */
export const PAYMENT_ICONS = [
  '💳', '💰', '💵', '💴', '💶', '💷', '💸',
  '🏦', '🏪', '💎', '📱', '⌚', '💚', '❤️',
  '🔵', '🟢', '🟡', '🟣', '⭐', '✨', '🎯',
];

/**
 * 预设颜色
 */
export const PAYMENT_COLORS = [
  '#1677FF', // 支付宝蓝
  '#07C160', // 微信绿
  '#10B981', // 现金绿
  '#6366F1', // 银行蓝
  '#EC4899', // 信用卡粉
  '#8B5CF6', // 紫色
  '#F97316', // 橙色
  '#EAB308', // 黄色
  '#06B6D4', // 青色
  '#14B8A6', // 青绿
  '#F43F5E', // 玫瑰红
  '#A855F7', // 紫罗兰
];

/**
 * 获取支付方式列表（带统计信息）
 */
export async function getPaymentMethodsWithStats(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase.rpc('get_payment_methods_with_stats');

  if (error) {
    console.error('获取支付方式列表失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 添加支付方式
 */
export async function addPaymentMethod(params: {
  name: string;
  type: PaymentMethod['type'];
  icon?: string;
  color?: string;
  last4Digits?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('add_payment_method', {
    p_name: params.name,
    p_type: params.type,
    p_icon: params.icon || null,
    p_color: params.color || null,
    p_last_4_digits: params.last4Digits || null,
  });

  if (error) {
    console.error('添加支付方式失败:', error);
    throw error;
  }

  return data;
}

/**
 * 更新支付方式
 */
export async function updatePaymentMethod(params: {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  last4Digits?: string;
}): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_payment_method', {
    p_id: params.id,
    p_name: params.name,
    p_icon: params.icon || null,
    p_color: params.color || null,
    p_last_4_digits: params.last4Digits || null,
  });

  if (error) {
    console.error('更新支付方式失败:', error);
    throw error;
  }

  return data;
}

/**
 * 删除支付方式
 */
export async function deletePaymentMethod(
  id: string,
  migrateToId?: string
): Promise<DeletePaymentMethodResult> {
  const { data, error } = await supabase.rpc('delete_payment_method', {
    p_id: id,
    p_migrate_to_id: migrateToId || null,
  });

  if (error) {
    console.error('删除支付方式失败:', error);
    throw error;
  }

  return data[0];
}

/**
 * 设置默认支付方式
 */
export async function setDefaultPaymentMethod(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_default_payment_method', {
    p_id: id,
  });

  if (error) {
    console.error('设置默认支付方式失败:', error);
    throw error;
  }

  return data;
}

/**
 * 获取支付方式使用详情
 */
export async function getPaymentMethodUsageDetail(
  id: string
): Promise<PaymentMethodUsageDetail> {
  const { data, error } = await supabase.rpc('get_payment_method_usage_detail', {
    p_id: id,
  });

  if (error) {
    console.error('获取支付方式使用详情失败:', error);
    throw error;
  }

  return data[0];
}

/**
 * 获取支付方式类型的配置信息
 */
export function getPaymentMethodTypeConfig(type: PaymentMethod['type']) {
  return PAYMENT_METHOD_TYPES.find((t) => t.value === type) || PAYMENT_METHOD_TYPES[5]; // 默认返回 'other'
}

/**
 * 格式化卡号后四位显示
 */
export function formatLast4Digits(last4: string | null): string {
  if (!last4) return '';
  return `**** ${last4}`;
}

/**
 * 获取支付方式显示标签
 */
export function getPaymentMethodLabel(paymentMethod: PaymentMethod): string {
  if (paymentMethod.last_4_digits) {
    return `${paymentMethod.name} ${formatLast4Digits(paymentMethod.last_4_digits)}`;
  }
  return paymentMethod.name;
}

/**
 * 获取默认支付方式
 */
export function getDefaultPaymentMethod(
  paymentMethods: PaymentMethod[]
): PaymentMethod | null {
  return paymentMethods.find((pm) => pm.is_default) || null;
}
