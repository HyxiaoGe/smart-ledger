/**
 * Transaction 服务统一导出（服务端版本）
 * 仅在服务端（API 路由、Server Components）使用
 * 支持通过环境变量 USE_PRISMA=true 切换到 Prisma 实现
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
 * 服务端服务工厂
 * 使用服务端 Repository（支持 Prisma 切换）
 */
class ServerTransactionServiceFactory {
  private static queryService: TransactionQueryService;
  private static summaryService: TransactionSummaryService;
  private static analyticsService: TransactionAnalyticsService;
  private static dashboardService: TransactionDashboardService;
  private static recordsPageService: TransactionRecordsPageService;
  private static mutationService: TransactionMutationService;

  static getQueryService(): TransactionQueryService {
    if (!this.queryService) {
      const repository = getTransactionRepository();
      this.queryService = new TransactionQueryService(repository, memoryCache);
    }
    return this.queryService;
  }

  static getSummaryService(): TransactionSummaryService {
    if (!this.summaryService) {
      const repository = getTransactionRepository();
      this.summaryService = new TransactionSummaryService(repository, memoryCache);
    }
    return this.summaryService;
  }

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
export const getQueryService = () => ServerTransactionServiceFactory.getQueryService();
export const getSummaryService = () => ServerTransactionServiceFactory.getSummaryService();
export const getAnalyticsService = () => ServerTransactionServiceFactory.getAnalyticsService();
export const getDashboardService = () => ServerTransactionServiceFactory.getDashboardService();
export const getRecordsPageService = () =>
  ServerTransactionServiceFactory.getRecordsPageService();
export const getMutationService = () => ServerTransactionServiceFactory.getMutationService();
export const resetServices = () => ServerTransactionServiceFactory.reset();

// 导出默认实例
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
