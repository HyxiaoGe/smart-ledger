/**
 * Transaction 服务统一导出
 * 使用服务端 Repository 工厂
 */

import {
  getCommonNoteRepository,
  getTransactionRepository,
} from '@/lib/infrastructure/repositories/index.server';
import { memoryCache } from '@/lib/infrastructure/cache';
import { TransactionQueryService } from './TransactionQueryService';
import { TransactionSummaryService } from './TransactionSummaryService';
import { TransactionAnalyticsService } from './TransactionAnalyticsService';
import { TransactionDashboardService } from './TransactionDashboardService';
import { TransactionRecordsPageService } from './TransactionRecordsPageService';
import { TransactionMutationService } from './TransactionMutationService';

// 导出服务类
export { TransactionQueryService } from './TransactionQueryService';
export { TransactionSummaryService } from './TransactionSummaryService';
export { TransactionAnalyticsService } from './TransactionAnalyticsService';
export { TransactionDashboardService } from './TransactionDashboardService';
export { TransactionRecordsPageService } from './TransactionRecordsPageService';
export { TransactionMutationService } from './TransactionMutationService';
export type { TransactionDashboardResult } from './TransactionDashboardService';
export type { TransactionRecordsPageData } from './TransactionRecordsPageService';

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
  private static dashboardService: TransactionDashboardService;
  private static recordsPageService: TransactionRecordsPageService;
  private static mutationService: TransactionMutationService;

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

  static getDashboardService(): TransactionDashboardService {
    if (!this.dashboardService) {
      const repository = getTransactionRepository();
      this.dashboardService = new TransactionDashboardService(repository, memoryCache);
    }
    return this.dashboardService;
  }

  static getRecordsPageService(): TransactionRecordsPageService {
    if (!this.recordsPageService) {
      this.recordsPageService = new TransactionRecordsPageService(
        this.getQueryService(),
        this.getSummaryService(),
        this.getAnalyticsService()
      );
    }
    return this.recordsPageService;
  }

  static getMutationService(): TransactionMutationService {
    if (!this.mutationService) {
      this.mutationService = new TransactionMutationService(
        this.getTransactionRepository(),
        getCommonNoteRepository()
      );
    }
    return this.mutationService;
  }

  private static getTransactionRepository() {
    return getTransactionRepository();
  }

  /**
   * 重置所有服务实例（用于测试）
   */
  static reset(): void {
    this.queryService = null as any;
    this.summaryService = null as any;
    this.analyticsService = null as any;
    this.dashboardService = null as any;
    this.recordsPageService = null as any;
    this.mutationService = null as any;
  }
}

// 导出工厂方法
export const getQueryService = () => TransactionServiceFactory.getQueryService();
export const getSummaryService = () => TransactionServiceFactory.getSummaryService();
export const getAnalyticsService = () => TransactionServiceFactory.getAnalyticsService();
export const getDashboardService = () => TransactionServiceFactory.getDashboardService();
export const getRecordsPageService = () => TransactionServiceFactory.getRecordsPageService();
export const getMutationService = () => TransactionServiceFactory.getMutationService();
export const resetServices = () => TransactionServiceFactory.reset();

// 导出默认实例（便于直接使用）
export const transactionQueryService = getQueryService();
export const transactionSummaryService = getSummaryService();
export const transactionAnalyticsService = getAnalyticsService();
export const transactionDashboardService = getDashboardService();
export const transactionRecordsPageService = getRecordsPageService();
export const transactionMutationService = getMutationService();

/**
 * 清空所有 Transaction 服务的缓存
 */
export function clearAllTransactionCaches(): void {
  transactionQueryService.clearCache();
  transactionSummaryService.clearCache();
  transactionAnalyticsService.clearCache();
  transactionDashboardService.clearCache();
}
