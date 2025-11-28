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
  transactionAnalyticsService
} from '@/lib/services/transaction/index.server';

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

/**
 * 清空所有 Transaction 服务的缓存
 */
export function clearAllTransactionCaches(): void {
  transactionQueryService.clearCache();
  transactionSummaryService.clearCache();
  transactionAnalyticsService.clearCache();
}
