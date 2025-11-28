/**
 * 通用类型定义
 */

/**
 * 查询过滤器
 */
export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: unknown;
}

/**
 * 排序选项
 */
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API 响应包装器
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 异步操作状态
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * 带状态的数据
 */
export interface AsyncData<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
}

/**
 * 时间范围
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * 月份标识（格式：YYYY-MM）
 */
export type MonthKey = `${number}-${string}`;

/**
 * 从 unknown 类型安全提取错误信息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '未知错误';
}

/**
 * 类型守卫：检查是否为 Error 对象
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
