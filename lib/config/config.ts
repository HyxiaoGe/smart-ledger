export const SUPPORTED_CURRENCIES = [
  { code: 'CNY', symbol: '¥', name: '人民币' },
  { code: 'USD', symbol: '$', name: '美元' }
] as const;

export const DEFAULT_CURRENCY = 'CNY' as const;

// AI 服务首选：DeepSeek（可通过环境变量切换）
export const DEFAULT_AI_PROVIDER = 'deepseek' as const;
