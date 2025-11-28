/**
 * 统一管理 localStorage keys
 * 所有本地存储的 key 都应该从这里导出使用
 */

// 前缀，用于避免与其他应用冲突
const PREFIX = 'smart-ledger';

/**
 * 数据同步相关
 */
export const STORAGE_KEYS = {
  // 跨页面数据同步
  SYNC_EVENT: `${PREFIX}-sync-event`,
  TRANSACTIONS_DIRTY: `${PREFIX}-transactions-dirty`,
  DATA_VERSION: `${PREFIX}-data-version`,
  SYNC_LOCK: `${PREFIX}-sync-lock`,

  // 常用备注缓存
  COMMON_NOTES_CACHE: 'common-notes-cache',

  // AI 反馈相关
  AI_FEEDBACKS: 'ai_feedbacks_v2',
  AI_FEEDBACK_SESSION: 'ai_feedback_session_v1',
  AI_SYNCED_IDS: 'ai_synced_ids_v1',

  // 预测缓存相关
  PREDICTION_CACHE: 'prediction_cache_v1',
  PREDICTION_FEEDBACKS: 'prediction_feedbacks_v1',
  PREDICTION_CACHE_MONTH: 'prediction_cache_month',
  PREDICTION_CACHE_TX_COUNT: 'prediction_cache_transaction_count',
} as const;

/**
 * LocalStorageCache 使用的前缀
 */
export const CACHE_PREFIX = `${PREFIX}-cache`;

/**
 * 获取所有 storage keys（用于清理）
 */
export function getAllStorageKeys(): string[] {
  return Object.values(STORAGE_KEYS);
}

/**
 * 清理所有应用相关的 localStorage 数据
 */
export function clearAllAppStorage(): void {
  if (typeof window === 'undefined') return;

  // 清理已知的 keys
  getAllStorageKeys().forEach(key => {
    localStorage.removeItem(key);
  });

  // 清理带前缀的缓存 keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

export type StorageKeyType = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
