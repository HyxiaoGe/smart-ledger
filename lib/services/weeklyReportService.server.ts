/**
 * 周报告服务 - 服务端版本
 * 使用 Repository 模式，支持 Prisma/Supabase 切换
 */

import { getWeeklyReportRepository } from '@/lib/infrastructure/repositories/index.server';
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
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.getMonth() + 1;
  const startDay = start.getDate();
  const endMonth = end.getMonth() + 1;
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth}月${startDay}日 - ${endDay}日`;
  } else {
    return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
  }
}

/**
 * 获取周数描述（今年第几周）
 */
export function getWeekDescription(date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();

  const firstDayOfYear = new Date(year, 0, 1);
  const daysDiff = Math.floor(
    (d.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weekNumber = Math.ceil((daysDiff + firstDayOfYear.getDay() + 1) / 7);

  return `${year}年第${weekNumber}周`;
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
  rent: '房租',
  utilities: '水电费',
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
