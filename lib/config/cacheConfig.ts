/**
 * 统一缓存配置
 * 集中管理所有缓存的 TTL 和相关配置
 */

/**
 * 缓存 TTL 配置（毫秒）
 */
export const CACHE_TTL = {
  // AI 预测缓存 - 30分钟（预测结果变化不频繁）
  PREDICTION: 30 * 60 * 1000,

  // AI 分析缓存 - 10分钟
  AI_ANALYSIS: 10 * 60 * 1000,

  // 交易列表缓存 - 1分钟（需要较新数据）
  TRANSACTIONS: 1 * 60 * 1000,

  // 常用备注缓存 - 24小时
  COMMON_NOTES: 24 * 60 * 60 * 1000,

  // 智能建议缓存 - 5分钟
  SMART_SUGGESTIONS: 5 * 60 * 1000,

  // 统计数据缓存 - 5分钟
  STATISTICS: 5 * 60 * 1000,

  // 默认 TTL - 5分钟
  DEFAULT: 5 * 60 * 1000,
} as const;

/**
 * 缓存键前缀
 */
export const CACHE_PREFIXES = {
  PREDICTION: 'prediction',
  AI_ANALYSIS: 'ai-analysis',
  TRANSACTIONS: 'transactions',
  STATISTICS: 'statistics',
  SUGGESTIONS: 'suggestions',
} as const;

/**
 * 缓存清理配置
 */
export const CACHE_CLEANUP = {
  // 清理间隔 - 5分钟（减少频繁清理）
  INTERVAL: 5 * 60 * 1000,

  // 最大缓存条目数
  MAX_ENTRIES: 100,

  // 强制清理阈值（超过24小时强制清理）
  FORCE_CLEANUP_AGE: 24 * 60 * 60 * 1000,
} as const;

export type CacheTTLKey = keyof typeof CACHE_TTL;
export type CachePrefixKey = keyof typeof CACHE_PREFIXES;
