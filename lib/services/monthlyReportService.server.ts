/**
 * 月报告服务 - 服务端版本
 * 使用 Repository 模式
 * 月报告包含所有支出（固定支出 + 可变支出），展示完整的月度财务状况
 */

import { getMonthlyReportRepository } from '@/lib/infrastructure/repositories/index.server';
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
  return `${year}年${month}月`;
}

/**
 * 分类映射表（英文 → 中文）
 */
const CATEGORY_MAP: Record<string, string> = {
  food: '餐饮',
  drink: '饮品',
  transport: '交通',
  shopping: '购物',
  entertainment: '娱乐',
  daily: '日用',
  housing: '住房',
  medical: '医疗',
  education: '教育',
  subscription: '订阅',
  other: '其他',
};

/**
 * 支付方式映射表（英文 → 中文）
 */
const PAYMENT_METHOD_MAP: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  cash: '现金',
  card: '银行卡',
  creditcard: '信用卡',
  debitcard: '借记卡',
  '未指定': '其他',
};

/**
 * 转换分类为中文
 */
export function getCategoryName(category: string): string {
  return CATEGORY_MAP[category.toLowerCase()] || category;
}

/**
 * 转换支付方式为中文
 */
export function getPaymentMethodName(method: string): string {
  return PAYMENT_METHOD_MAP[method.toLowerCase()] || method;
}

/**
 * 格式化金额（千分位 + 2位小数）
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * 格式化百分比（1位小数）
 */
export function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
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
