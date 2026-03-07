/**
 * 周报告服务 - 服务端版本
 * 使用 Repository 模式，支持 Prisma/Supabase 切换
 */

import { getWeeklyReportRepository } from '@/lib/infrastructure/repositories/index.server';
import { formatWeekRangeLabel, getWeekNumberDescription } from '@/lib/utils/date';
import { formatCurrencyAmount, formatSignedPercentage } from '@/lib/utils/format';
import { getReportCategoryName, getReportPaymentMethodName } from '@/lib/utils/reportMetadata';
import type {
  WeeklyReport,
  WeeklyReportGenerationResult,
  CategoryStat,
  MerchantStat,
  PaymentMethodStat,
} from '@/lib/domain/repositories/IWeeklyReportRepository';

// 重新导出类型
export type {
  WeeklyReport,
  WeeklyReportGenerationResult,
  CategoryStat,
  MerchantStat,
  PaymentMethodStat,
};

/**
 * 获取所有周报告列表
 */
export async function getAllWeeklyReports(): Promise<WeeklyReport[]> {
  const repository = getWeeklyReportRepository();
  return repository.findAll();
}

/**
 * 根据ID获取单个周报告
 */
export async function getWeeklyReportById(id: string): Promise<WeeklyReport | null> {
  const repository = getWeeklyReportRepository();
  return repository.findById(id);
}

/**
 * 获取最新的周报告
 */
export async function getLatestWeeklyReport(): Promise<WeeklyReport | null> {
  const repository = getWeeklyReportRepository();
  return repository.findLatest();
}

/**
 * 手动生成周报告
 */
export async function generateWeeklyReport(
  weekStartDate?: string
): Promise<WeeklyReportGenerationResult> {
  const repository = getWeeklyReportRepository();
  return repository.generate(weekStartDate);
}

/**
 * 格式化日期范围显示
 */
export function formatWeekRange(startDate: string, endDate: string): string {
  return formatWeekRangeLabel(startDate, endDate);
}

/**
 * 获取周数描述（今年第几周）
 */
export function getWeekDescription(date: string): string {
  return getWeekNumberDescription(date);
}

/**
 * 转换分类为中文
 */
export function getCategoryName(category: string): string {
  return getReportCategoryName(category);
}

/**
 * 转换支付方式为中文
 */
export function getPaymentMethodName(method: string): string {
  return getReportPaymentMethodName(method);
}

/**
 * 格式化金额（千分位 + 2位小数）
 */
export function formatCurrency(amount: number): string {
  return formatCurrencyAmount(amount);
}

/**
 * 格式化百分比（1位小数）
 */
export function formatPercentage(value: number): string {
  return formatSignedPercentage(value);
}
