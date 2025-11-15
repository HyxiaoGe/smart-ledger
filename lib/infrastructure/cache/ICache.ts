/**
 * 缓存接口
 * 定义统一的缓存操作标准
 */

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /**
   * 缓存过期时间（毫秒）
   */
  ttl?: number;

  /**
   * 缓存标签（用于批量失效）
   */
  tags?: string[];

  /**
   * 是否允许缓存空值
   */
  allowNull?: boolean;
}

/**
 * 缓存条目
 */
export interface CacheEntry<T> {
  /**
   * 缓存的值
   */
  value: T;

  /**
   * 创建时间戳
   */
  timestamp: number;

  /**
   * 过期时间戳（可选）
   */
  expiresAt?: number;

  /**
   * 缓存标签
   */
  tags?: string[];
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /**
   * 缓存命中次数
   */
  hits: number;

  /**
   * 缓存未命中次数
   */
  misses: number;

  /**
   * 缓存命中率
   */
  hitRate: number;

  /**
   * 当前缓存条目数
   */
  size: number;
}

/**
 * 缓存接口
 */
export interface ICache<T = any> {
  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或 null
   */
  get(key: string): T | null;

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param options 缓存选项
   */
  set(key: string, value: T, options?: CacheOptions): void;

  /**
   * 检查缓存是否存在且有效
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean;

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): void;

  /**
   * 清空所有缓存
   */
  clear(): void;

  /**
   * 根据标签失效缓存
   * @param tag 标签名
   */
  invalidateByTag(tag: string): void;

  /**
   * 根据前缀失效缓存
   * @param prefix 前缀
   */
  invalidateByPrefix(prefix: string): void;

  /**
   * 获取所有缓存键
   */
  keys(): string[];

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats;

  /**
   * 清理过期缓存
   */
  cleanup(): void;
}

/**
 * 异步缓存接口
 */
export interface IAsyncCache<T = any> {
  /**
   * 异步获取缓存值
   */
  get(key: string): Promise<T | null>;

  /**
   * 异步设置缓存值
   */
  set(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * 异步检查缓存是否存在
   */
  has(key: string): Promise<boolean>;

  /**
   * 异步删除缓存
   */
  delete(key: string): Promise<void>;

  /**
   * 异步清空所有缓存
   */
  clear(): Promise<void>;

  /**
   * 异步根据标签失效缓存
   */
  invalidateByTag(tag: string): Promise<void>;

  /**
   * 异步根据前缀失效缓存
   */
  invalidateByPrefix(prefix: string): Promise<void>;

  /**
   * 异步获取所有缓存键
   */
  keys(): Promise<string[]>;

  /**
   * 异步获取缓存统计信息
   */
  getStats(): Promise<CacheStats>;

  /**
   * 异步清理过期缓存
   */
  cleanup(): Promise<void>;
}
