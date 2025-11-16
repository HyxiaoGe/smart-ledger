/**
 * 交易 DTO 类型定义
 * Data Transfer Objects for Transaction domain
 */

import type { TransactionType, Currency } from '../domain/transaction';

/**
 * 创建交易 DTO
 */
export interface CreateTransactionDTO {
  type: TransactionType;
  category: string;
  amount: number;
  note?: string;
  date: string;
  currency?: Currency;
  payment_method?: string;
  merchant?: string;
  subcategory?: string;
  product?: string;
}

/**
 * 更新交易 DTO
 */
export interface UpdateTransactionDTO {
  type?: TransactionType;
  category?: string;
  amount?: number;
  note?: string;
  date?: string;
  currency?: Currency;
  payment_method?: string;
  merchant?: string;
  subcategory?: string;
  product?: string;
}

/**
 * 查询过滤条件
 */
export interface TransactionQueryFilter {
  type?: TransactionType;
  category?: string;
  startDate?: string;
  endDate?: string;
  currency?: Currency;
  paymentMethod?: string;
  merchant?: string;
  subcategory?: string;
  minAmount?: number;
  maxAmount?: number;
  includeDeleted?: boolean;
}

/**
 * 排序选项
 */
export interface TransactionSortOptions {
  field: 'date' | 'amount' | 'created_at';
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
  hasMore: boolean;
}

/**
 * 交易统计结果
 */
export interface TransactionStats {
  totalAmount: number;
  count: number;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
}

/**
 * 按分类统计结果
 */
export interface CategoryStats {
  category: string;
  totalAmount: number;
  count: number;
  percentage: number;
}
