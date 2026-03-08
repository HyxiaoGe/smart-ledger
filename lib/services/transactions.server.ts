/**
 * Transaction 服务（服务端版本）
 * 仅在服务端（API 路由、Server Components）使用
 * 支持通过环境变量 USE_PRISMA=true 切换到 Prisma 实现
 *
 * 注意：客户端组件请使用 transactions.ts
 */

import {
  transactionQueryService,
  transactionSummaryService,
  transactionAnalyticsService,
  transactionDashboardService,
  transactionRecordsPageService,
  transactionMutationService,
} from '@/lib/services/transaction/index.server';
import type { CreateTransactionDTO, UpdateTransactionDTO } from '@/types/dto/transaction.dto';

/**
 * 根据范围查询交易列表
 */
export async function listTransactionsByRange(
  month?: string,
  range?: string,
  startDate?: string,
  endDate?: string
) {
  return transactionQueryService.listByRange(month, range, startDate, endDate);
}

export async function getTransactionById(id: string) {
  return transactionQueryService.findById(id);
}

/**
 * 查询昨天的交易
 */
export async function listYesterdayTransactions(range?: string) {
  return transactionQueryService.listYesterdayTransactions(range);
}

/**
 * 获取当前月份汇总
 */
export async function getCurrentMonthSummary() {
  return transactionSummaryService.getCurrentMonthSummary();
}

/**
 * 获取AI分析数据
 */
export async function getAIAnalysisData(targetMonth?: string) {
  return transactionAnalyticsService.getAIAnalysisData(targetMonth);
}

/**
 * 获取预测数据
 */
export async function getPredictionData(monthsToAnalyze: number = 6) {
  return transactionAnalyticsService.getPredictionData(monthsToAnalyze);
}

export async function getMonthlyAnalysisBundle(
  targetMonth?: string,
  monthsToAnalyze: number = 6
) {
  return transactionAnalyticsService.getMonthlyAnalysisBundle(targetMonth, monthsToAnalyze);
}

/**
 * 获取首页交易看板数据
 */
export async function getTransactionDashboardData(params: {
  currency: string;
  month?: string;
  range?: string;
  startDate?: string;
  endDate?: string;
}) {
  return transactionDashboardService.getDashboardData(params);
}

/**
 * 获取记录页交易主数据
 */
export async function getTransactionRecordsPageData(
  month?: string,
  range?: string,
  startDate?: string,
  endDate?: string
) {
  return transactionRecordsPageService.getPageData({
    month,
    range,
    startDate,
    endDate,
  });
}

export async function getTransactionRecordsPageViewData(
  month?: string,
  range?: string,
  startDate?: string,
  endDate?: string
) {
  return transactionRecordsPageService.getPageViewData({
    month,
    range,
    startDate,
    endDate,
  });
}

export async function createTransaction(input: CreateTransactionDTO) {
  return transactionMutationService.createTransaction(input);
}

export async function updateTransaction(id: string, input: UpdateTransactionDTO) {
  return transactionMutationService.updateTransaction(id, input);
}

export async function deleteTransaction(id: string) {
  return transactionMutationService.deleteTransaction(id);
}

export async function restoreTransaction(id: string) {
  return transactionMutationService.restoreTransaction(id);
}

/**
 * 清空所有 Transaction 服务的缓存
 */
export function clearAllTransactionCaches(): void {
  transactionQueryService.clearCache();
  transactionSummaryService.clearCache();
  transactionAnalyticsService.clearCache();
  transactionDashboardService.clearCache();
}
