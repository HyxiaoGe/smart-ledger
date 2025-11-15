/**
 * Transaction 服务统一导出
 */

import { getTransactionRepository } from '@/lib/infrastructure/repositories';
import { memoryCache } from '@/lib/infrastructure/cache';
import { TransactionQueryService } from './TransactionQueryService';
import { TransactionSummaryService } from './TransactionSummaryService';
import { TransactionAnalyticsService } from './TransactionAnalyticsService';

// 导出服务类
export { TransactionQueryService } from './TransactionQueryService';
export { TransactionSummaryService } from './TransactionSummaryService';
export { TransactionAnalyticsService } from './TransactionAnalyticsService';

// 导出类型
export type { TransactionQueryResult } from './TransactionQueryService';
export type {
  MonthSummaryResult,
  DailySummary,
  CategorySummary
} from './TransactionSummaryService';
export type { AIAnalysisData, PredictionData } from './TransactionAnalyticsService';

/**
 * 服务工厂
 * 提供单例的服务实例
 */
class TransactionServiceFactory {
  private static queryService: TransactionQueryService;
  private static summaryService: TransactionSummaryService;
  private static analyticsService: TransactionAnalyticsService;

  /**
   * 获取查询服务实例
   */
  static getQueryService(): TransactionQueryService {
    if (!this.queryService) {
      const repository = getTransactionRepository();
      this.queryService = new TransactionQueryService(repository, memoryCache);
    }
    return this.queryService;
  }

  /**
   * 获取汇总服务实例
   */
  static getSummaryService(): TransactionSummaryService {
    if (!this.summaryService) {
      const repository = getTransactionRepository();
      this.summaryService = new TransactionSummaryService(repository, memoryCache);
    }
    return this.summaryService;
  }

  /**
   * 获取分析服务实例
   */
  static getAnalyticsService(): TransactionAnalyticsService {
    if (!this.analyticsService) {
      const repository = getTransactionRepository();
      this.analyticsService = new TransactionAnalyticsService(repository, memoryCache);
    }
    return this.analyticsService;
  }

  /**
   * 重置所有服务实例（用于测试）
   */
  static reset(): void {
    this.queryService = null as any;
    this.summaryService = null as any;
    this.analyticsService = null as any;
  }
}

// 导出工厂方法
export const getQueryService = () => TransactionServiceFactory.getQueryService();
export const getSummaryService = () => TransactionServiceFactory.getSummaryService();
export const getAnalyticsService = () => TransactionServiceFactory.getAnalyticsService();
export const resetServices = () => TransactionServiceFactory.reset();

// 导出默认实例（便于直接使用）
export const transactionQueryService = getQueryService();
export const transactionSummaryService = getSummaryService();
export const transactionAnalyticsService = getAnalyticsService();

/**
 * 清空所有 Transaction 服务的缓存
 */
export function clearAllTransactionCaches(): void {
  transactionQueryService.clearCache();
  transactionSummaryService.clearCache();
  transactionAnalyticsService.clearCache();
}
