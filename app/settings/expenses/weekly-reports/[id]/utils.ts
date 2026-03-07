import { formatWeekRangeLabel, getWeekNumberDescription } from '@/lib/utils/date';
import { formatCurrencyAmount, formatSignedPercentage } from '@/lib/utils/format';
import {
  REPORT_CATEGORY_NAME_MAP,
  REPORT_PAYMENT_METHOD_NAME_MAP,
  getReportCategoryName,
  getReportPaymentMethodName,
} from '@/lib/utils/reportMetadata';

// 周报告详情页工具函数和常量

export const CATEGORY_MAP = REPORT_CATEGORY_NAME_MAP;

export const PAYMENT_METHOD_MAP = REPORT_PAYMENT_METHOD_NAME_MAP;

// 图表颜色配置
export const CATEGORY_COLORS = [
  '#9333ea', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#f43f5e', '#14b8a6'
];

export const PAYMENT_COLORS = [
  '#3b82f6', '#06b6d4', '#0ea5e9', '#60a5fa',
  '#38bdf8', '#7dd3fc'
];

export function formatWeekRange(startDate: string, endDate: string): string {
  return formatWeekRangeLabel(startDate, endDate);
}

export function getWeekDescription(date: string): string {
  return getWeekNumberDescription(date);
}

export function getCategoryName(category: string): string {
  return getReportCategoryName(category);
}

export function getPaymentMethodName(method: string): string {
  return getReportPaymentMethodName(method);
}

export function formatCurrency(amount: number | null | undefined): string {
  return formatCurrencyAmount(amount);
}

export function formatPercentage(value: number | null | undefined): string {
  return formatSignedPercentage(value);
}
