import type { PaymentMethod } from '@/lib/api/services/payment-methods';

// 支付方式类型配置
export const PAYMENT_METHOD_TYPES = [
  { value: 'alipay', label: '支付宝', icon: 'Alipay', color: '#1677FF', brandIcon: true },
  { value: 'wechat', label: '微信支付', icon: 'WechatPay', color: '#07C160', brandIcon: true },
  { value: 'cash', label: '现金', icon: 'Cash', color: '#10B981', brandIcon: false },
  { value: 'debit_card', label: '借记卡', icon: 'BankCard', color: '#6366F1', brandIcon: false },
  { value: 'credit_card', label: '信用卡', icon: 'CreditCard', color: '#EC4899', brandIcon: false },
  { value: 'other', label: '其他', icon: 'PhonePay', color: '#8B5CF6', brandIcon: false },
] as const;

// 可选图标列表
export const PAYMENT_ICONS = [
  '💳', '💰', '💵', '💴', '💶', '💷', '💸',
  '🏦', '🏪', '💎', '📱', '⌚', '💚', '❤️',
  '🔵', '🟢', '🟡', '🟣', '⭐', '✨', '🎯',
];

// 可选颜色列表
export const PAYMENT_COLORS = [
  '#1677FF', '#07C160', '#10B981', '#6366F1', '#EC4899', '#8B5CF6',
  '#F97316', '#EAB308', '#06B6D4', '#14B8A6', '#F43F5E', '#A855F7',
];

// 获取支付方式类型配置
export function getPaymentMethodTypeConfig(type: PaymentMethod['type']) {
  return PAYMENT_METHOD_TYPES.find((t) => t.value === type) || PAYMENT_METHOD_TYPES[5];
}

// 格式化卡号后四位
export function formatLast4Digits(last4: string | null): string {
  if (!last4) return '';
  return `**** ${last4}`;
}
