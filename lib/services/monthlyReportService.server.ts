/**
 * 月报告服务 - 服务端版本
 * 使用 Repository 模式
 * 月报告包含所有支出（固定支出 + 可变支出），展示完整的月度财务状况
 */

import { getMonthlyReportRepository } from '@/lib/infrastructure/repositories/index.server';
import { formatYearMonthLabel } from '@/lib/utils/date';
import { formatCurrencyAmount, formatSignedPercentage } from '@/lib/utils/format';
import { getReportCategoryName, getReportPaymentMethodName } from '@/lib/utils/reportMetadata';
import type {
  MonthlyReport,
  MonthlyReportGenerationResult,
  CategoryStat,
  MerchantStat,
  PaymentMethodStat,
  FixedExpenseItem,
} from '@/lib/domain/repositories/IMonthlyReportRepository';

// 重新导出类型
export type {
  MonthlyReport,
  MonthlyReportGenerationResult,
  CategoryStat,
  MerchantStat,
  PaymentMethodStat,
  FixedExpenseItem,
};

/**
 * 获取所有月报告列表
 */
export async function getAllMonthlyReports(): Promise<MonthlyReport[]> {
  const repository = getMonthlyReportRepository();
  return repository.findAll();
}

/**
 * 根据ID获取单个月报告
 */
export async function getMonthlyReportById(id: string): Promise<MonthlyReport | null> {
  const repository = getMonthlyReportRepository();
  return repository.findById(id);
}

/**
 * 根据年月获取月报告
 */
export async function getMonthlyReportByYearMonth(year: number, month: number): Promise<MonthlyReport | null> {
  const repository = getMonthlyReportRepository();
  return repository.findByYearMonth(year, month);
}

/**
 * 获取最新的月报告
 */
export async function getLatestMonthlyReport(): Promise<MonthlyReport | null> {
  const repository = getMonthlyReportRepository();
  return repository.findLatest();
}

/**
 * 获取某年的所有月报告
 */
export async function getMonthlyReportsByYear(year: number): Promise<MonthlyReport[]> {
  const repository = getMonthlyReportRepository();
  return repository.findByYear(year);
}

/**
 * 生成月报告
 */
export async function generateMonthlyReport(
  year: number,
  month: number
): Promise<MonthlyReportGenerationResult> {
  const repository = getMonthlyReportRepository();
  return repository.generate(year, month);
}

/**
 * 删除月报告
 */
export async function deleteMonthlyReport(id: string): Promise<void> {
  const repository = getMonthlyReportRepository();
  return repository.delete(id);
}

/**
 * 格式化月份显示
 */
export function formatMonthDisplay(year: number, month: number): string {
  return formatYearMonthLabel(year, month);
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

/**
 * 计算固定支出占比
 */
export function getFixedExpenseRatio(report: MonthlyReport): number {
  if (report.total_expenses === 0) return 0;
  return (report.fixed_expenses / report.total_expenses) * 100;
}

/**
 * 计算可变支出占比
 */
export function getVariableExpenseRatio(report: MonthlyReport): number {
  if (report.total_expenses === 0) return 0;
  return (report.variable_expenses / report.total_expenses) * 100;
}
