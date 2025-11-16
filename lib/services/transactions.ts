/**
 * Transaction 服务 - 兼容层
 *
 * @deprecated 此文件已被重构为新的服务层架构，请使用：
 * - `@/lib/services/transaction/TransactionQueryService` 替代查询相关函数
 * - `@/lib/services/transaction/TransactionSummaryService` 替代汇总相关函数
 * - `@/lib/services/transaction/TransactionAnalyticsService` 替代分析相关函数
 *
 * 此文件保留仅为向后兼容，内部已迁移到新的服务层实现。
 * 新功能请直接使用新的服务层 API。
 */

import {
  transactionQueryService,
  transactionSummaryService,
  transactionAnalyticsService
} from '@/lib/services/transaction';

/**
 * 根据范围查询交易列表
 * @deprecated 请使用 `transactionQueryService.listByRange()` 替代
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
 * @deprecated 请使用 `transactionQueryService.listYesterdayTransactions()` 替代
 */
export async function listYesterdayTransactions(range?: string) {
  return transactionQueryService.listYesterdayTransactions(range);
}

/**
 * 获取当前月份汇总
 * @deprecated 请使用 `transactionSummaryService.getCurrentMonthSummary()` 替代
 */
export async function getCurrentMonthSummary() {
  return transactionSummaryService.getCurrentMonthSummary();
}

/**
 * 获取AI分析数据
 * @deprecated 请使用 `transactionAnalyticsService.getAIAnalysisData()` 替代
 */
export async function getAIAnalysisData(targetMonth?: string) {
  return transactionAnalyticsService.getAIAnalysisData(targetMonth);
}

/**
 * 获取预测数据
 * @deprecated 请使用 `transactionAnalyticsService.getPredictionData()` 替代
 */
export async function getPredictionData(monthsToAnalyze: number = 6) {
  return transactionAnalyticsService.getPredictionData(monthsToAnalyze);
}
