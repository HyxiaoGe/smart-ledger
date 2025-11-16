/**
 * 交易仓储接口
 * 定义所有交易数据访问的标准接口，实现数据访问层的抽象
 */

import type { Transaction, TransactionType } from '@/types/domain/transaction';
import type {
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionQueryFilter,
  TransactionSortOptions,
  PaginationOptions,
  PaginatedResult,
  TransactionStats,
  CategoryStats,
} from '@/types/dto/transaction.dto';

/**
 * 交易仓储接口
 */
export interface ITransactionRepository {
  /**
   * 根据 ID 查找交易
   */
  findById(id: string): Promise<Transaction | null>;

  /**
   * 根据条件查找交易列表
   */
  findMany(
    filter: TransactionQueryFilter,
    sort?: TransactionSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Transaction>>;

  /**
   * 根据日期范围查找交易
   */
  findByDateRange(
    startDate: string,
    endDate: string,
    type?: TransactionType
  ): Promise<Transaction[]>;

  /**
   * 根据月份查找交易
   */
  findByMonth(year: number, month: number, type?: TransactionType): Promise<Transaction[]>;

  /**
   * 创建交易
   */
  create(transaction: CreateTransactionDTO): Promise<Transaction>;

  /**
   * 更新交易
   */
  update(id: string, transaction: UpdateTransactionDTO): Promise<Transaction>;

  /**
   * 软删除交易
   */
  softDelete(id: string): Promise<void>;

  /**
   * 硬删除交易
   */
  hardDelete(id: string): Promise<void>;

  /**
   * 恢复已删除的交易
   */
  restore(id: string): Promise<void>;

  /**
   * 获取统计信息
   */
  getStats(filter: TransactionQueryFilter): Promise<TransactionStats>;

  /**
   * 获取按分类统计
   */
  getStatsByCategory(filter: TransactionQueryFilter): Promise<CategoryStats[]>;

  /**
   * 批量创建交易
   */
  createMany(transactions: CreateTransactionDTO[]): Promise<Transaction[]>;

  /**
   * 检查交易是否存在
   */
  exists(id: string): Promise<boolean>;

  /**
   * 获取最近的 N 条交易
   */
  findRecent(limit: number, type?: TransactionType): Promise<Transaction[]>;
}
