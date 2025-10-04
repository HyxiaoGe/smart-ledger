// 全局配置：预设类别、币种与 AI 首选项（中文注释）

export const SUPPORTED_CURRENCIES = [
  { code: 'CNY', symbol: '¥', name: '人民币' },
  { code: 'USD', symbol: '$', name: '美元' }
] as const;

export const DEFAULT_CURRENCY = 'CNY' as const;

// 预设类别（可在后续实现中支持增删改）
export const PRESET_CATEGORIES: { key: string; label: string; color?: string; icon?: string }[] = [
  { key: 'food', label: '吃饭', color: '#F97316', icon: '🍜' },
  { key: 'drink', label: '饮料', color: '#22C55E', icon: '🥤' },
  { key: 'transport', label: '交通', color: '#06B6D4', icon: '🚌' },
  { key: 'entertainment', label: '娱乐', color: '#A855F7', icon: '🎮' },
  { key: 'salary', label: '工资', color: '#10B981', icon: '💼' },
  { key: 'rent', label: '房租', color: '#3B82F6', icon: '🏠' },
  { key: 'utilities', label: '水电', color: '#0EA5E9', icon: '💡' },
  { key: 'daily', label: '日常开销', color: '#F59E0B', icon: '🧺' },
  { key: 'subscription', label: '订阅', color: '#EF4444', icon: '📦' },
  { key: 'other', label: '其他', color: '#6B7280', icon: '📁' }
];

// AI 服务首选：DeepSeek（可通过环境变量切换）
export const DEFAULT_AI_PROVIDER = 'deepseek' as const;
