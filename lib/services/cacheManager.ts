/**
 * 智能缓存管理器
 * 用于管理预测缓存的生命周期和智能失效
 */

import { predictionCache } from './predictionCache';

interface CacheInvalidationRule {
  id: string;
  name: string;
  condition: (context: CacheContext) => boolean;
  action: () => void;
  priority: number; // 优先级，数字越小优先级越高
}

interface CacheContext {
  newTransaction?: any;
  transactionCount: number;
  lastTransactionDate?: string;
  currentMonth: string;
  timeSinceLastCache: number; // 毫秒
}

class CacheManager {
  private static instance: CacheManager;
  private rules: CacheInvalidationRule[] = [];
  private lastInvalidationTime = 0;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
      CacheManager.instance.initializeRules();
    }
    return CacheManager.instance;
  }

  /**
   * 初始化缓存失效规则
   */
  private initializeRules(): void {
    // 规则1：新增交易时失效
    this.addRule({
      id: 'new_transaction',
      name: '新增交易时失效缓存',
      condition: (context) => !!context.newTransaction,
      action: () => {
        predictionCache.invalidateCache();
        console.log('🔄 新增交易，预测缓存已失效');
      },
      priority: 1
    });

    // 规则2：交易数量变化时失效
    this.addRule({
      id: 'transaction_count_change',
      name: '交易数量变化时失效缓存',
      condition: (context) => {
        const cachedData = this.getCachedTransactionCount();
        return cachedData !== null && cachedData !== context.transactionCount;
      },
      action: () => {
        predictionCache.invalidateCache();
        this.updateCachedTransactionCount();
        console.log('📊 交易数量变化，预测缓存已失效');
      },
      priority: 2
    });

    // 规则3：跨月时失效
    this.addRule({
      id: 'cross_month',
      name: '跨月时失效缓存',
      condition: (context) => {
        const cachedMonth = localStorage.getItem('prediction_cache_month');
        return cachedMonth !== context.currentMonth;
      },
      action: () => {
        predictionCache.invalidateCache();
        localStorage.setItem('prediction_cache_month', context.currentMonth);
        console.log('📅 跨月更新，预测缓存已失效');
      },
      priority: 3
    });

    // 规则4：缓存过期时失效
    this.addRule({
      id: 'cache_expired',
      name: '缓存过期时失效',
      condition: (context) => {
        return !predictionCache.isCacheValid();
      },
      action: () => {
        predictionCache.invalidateCache();
        console.log('⏰ 缓存已过期，自动清理');
      },
      priority: 4
    });

    // 规则5：定期清理（超过24小时强制清理）
    this.addRule({
      id: 'periodic_cleanup',
      name: '定期清理缓存',
      condition: (context) => {
        const now = Date.now();
        return (now - this.lastInvalidationTime) > 24 * 60 * 60 * 1000; // 24小时
      },
      action: () => {
        predictionCache.invalidateCache();
        this.lastInvalidationTime = Date.now();
        console.log('🧹 定期清理缓存');
      },
      priority: 5
    });
  }

  /**
   * 添加缓存失效规则
   */
  addRule(rule: Omit<CacheInvalidationRule, 'priority'>, priority: number = 10): void {
    this.rules.push({ ...rule, priority });
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 移除缓存失效规则
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * 检查并执行缓存失效规则
   */
  async checkAndInvalidate(context: CacheContext): Promise<boolean> {
    let invalidated = false;

    for (const rule of this.rules) {
      try {
        if (rule.condition(context)) {
          console.log(`🔍 触发缓存规则: ${rule.name}`);
          rule.action();
          invalidated = true;
          break; // 执行第一个匹配的规则后停止
        }
      } catch (error) {
        console.error(`执行缓存规则失败 [${rule.name}]:`, error);
      }
    }

    return invalidated;
  }

  /**
   * 手动触发缓存检查
   */
  async invalidateOnTransaction(newTransaction: any, transactionCount: number): Promise<void> {
    const context: CacheContext = {
      newTransaction,
      transactionCount,
      lastTransactionDate: newTransaction?.date,
      currentMonth: new Date().toISOString().slice(0, 7),
      timeSinceLastCache: Date.now() - this.lastInvalidationTime
    };

    await this.checkAndInvalidate(context);
  }

  /**
   * 获取缓存的交易数量
   */
  private getCachedTransactionCount(): number | null {
    try {
      const cached = localStorage.getItem('prediction_cache_transaction_count');
      return cached ? parseInt(cached) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 更新缓存的交易数量
   */
  private updateCachedTransactionCount(): void {
    try {
      // 这里应该从实际的数据源获取，现在先保存一个占位符
      const count = Math.floor(Math.random() * 100) + 20; // 模拟数据
      localStorage.setItem('prediction_cache_transaction_count', count.toString());
    } catch (error) {
      console.error('更新缓存交易数量失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    isValid: boolean;
    rulesCount: number;
    lastInvalidationTime: number;
    feedbackStats: any;
  } {
    return {
      isValid: predictionCache.isCacheValid(),
      rulesCount: this.rules.length,
      lastInvalidationTime: this.lastInvalidationTime,
      feedbackStats: predictionCache.getFeedbackStats()
    };
  }

  /**
   * 清理所有缓存
   */
  clearAllCaches(): void {
    predictionCache.clearCache();
    localStorage.removeItem('prediction_cache_transaction_count');
    localStorage.removeItem('prediction_cache_month');
    this.lastInvalidationTime = Date.now();
    console.log('🗑️ 所有预测缓存已清理');
  }
}

// 导出单例实例
export const cacheManager = CacheManager.getInstance();

// 工具函数：在交易变化时调用
export async function handleTransactionChange(
  newTransaction?: any,
  transactionCount?: number
): Promise<void> {
  if (newTransaction) {
    await cacheManager.invalidateOnTransaction(newTransaction, transactionCount || 0);
  }
}

// 工具函数：检查缓存状态
export function getCacheStatus(): {
  isValid: boolean;
  needsRefresh: boolean;
  stats: any;
} {
  const stats = cacheManager.getCacheStats();
  return {
    isValid: stats.isValid,
    needsRefresh: !stats.isValid,
    stats
  };
}