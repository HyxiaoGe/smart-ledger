/**
 * Prisma 交易仓储实现
 * 实现 ITransactionRepository 接口，提供基于 Prisma 的数据访问
 */

import type { PrismaClient, Prisma } from '@/generated/prisma/client';
import type { Transaction, TransactionType } from '@/types/domain/transaction';
import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type {
  TransactionQueryFilter,
  TransactionSortOptions,
  PaginationOptions,
  PaginatedResult,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionStats,
  CategoryStats,
} from '@/types/dto/transaction.dto';

/**
 * Prisma 交易仓储实现
 */
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 根据 ID 查找交易
   */
  async findById(id: string): Promise<Transaction | null> {
    const data = await this.prisma.transactions.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    return data ? this.mapToEntity(data) : null;
  }

  /**
   * 根据条件查找交易列表
   */
  async findMany(
    filter: TransactionQueryFilter,
    sort?: TransactionSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Transaction>> {
    const where = this.buildWhereClause(filter);

    // 构建排序
    const orderBy: Prisma.transactionsOrderByWithRelationInput = sort
      ? { [sort.field]: sort.order }
      : { date: 'desc' };

    // 计算分页
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // 并行执行查询和计数
    const [data, total] = await Promise.all([
      this.prisma.transactions.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.transactions.count({ where }),
    ]);

    return {
      data: data.map(this.mapToEntity),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: total > page * pageSize,
    };
  }

  /**
   * 根据日期范围查找交易
   */
  async findByDateRange(
    startDate: string,
    endDate: string,
    type?: TransactionType
  ): Promise<Transaction[]> {
    const data = await this.prisma.transactions.findMany({
      where: {
        deleted_at: null,
        date: {
          gte: new Date(startDate),
          lt: new Date(endDate),
        },
        ...(type && { type }),
      },
      orderBy: { date: 'desc' },
    });

    return data.map(this.mapToEntity);
  }

  /**
   * 根据月份查找交易
   */
  async findByMonth(year: number, month: number, type?: TransactionType): Promise<Transaction[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 1).toISOString().slice(0, 10);

    return this.findByDateRange(startDate, endDate, type);
  }

  /**
   * 创建交易
   */
  async create(transaction: CreateTransactionDTO): Promise<Transaction> {
    const data = await this.prisma.transactions.create({
      data: {
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        note: transaction.note,
        date: new Date(transaction.date),
        currency: transaction.currency || 'CNY',
        payment_method: transaction.payment_method,
        merchant: transaction.merchant,
        subcategory: transaction.subcategory,
        product: transaction.product,
      },
    });

    return this.mapToEntity(data);
  }

  /**
   * 更新交易
   */
  async update(id: string, transaction: UpdateTransactionDTO): Promise<Transaction> {
    const updateData: Prisma.transactionsUpdateInput = {};

    if (transaction.type !== undefined) updateData.type = transaction.type;
    if (transaction.category !== undefined) updateData.category = transaction.category;
    if (transaction.amount !== undefined) updateData.amount = transaction.amount;
    if (transaction.note !== undefined) updateData.note = transaction.note;
    if (transaction.date !== undefined) updateData.date = new Date(transaction.date);
    if (transaction.currency !== undefined) updateData.currency = transaction.currency;
    if (transaction.payment_method !== undefined) updateData.payment_method = transaction.payment_method;
    if (transaction.merchant !== undefined) updateData.merchant = transaction.merchant;
    if (transaction.subcategory !== undefined) updateData.subcategory = transaction.subcategory;
    if (transaction.product !== undefined) updateData.product = transaction.product;

    const data = await this.prisma.transactions.update({
      where: { id },
      data: updateData,
    });

    return this.mapToEntity(data);
  }

  /**
   * 软删除交易
   */
  async softDelete(id: string): Promise<void> {
    await this.prisma.transactions.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  /**
   * 硬删除交易
   */
  async hardDelete(id: string): Promise<void> {
    await this.prisma.transactions.delete({
      where: { id },
    });
  }

  /**
   * 恢复已删除的交易
   */
  async restore(id: string): Promise<void> {
    await this.prisma.transactions.update({
      where: { id },
      data: { deleted_at: null },
    });
  }

  /**
   * 获取统计信息
   */
  async getStats(filter: TransactionQueryFilter): Promise<TransactionStats> {
    const where = this.buildWhereClause(filter);

    const result = await this.prisma.transactions.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
      _min: { amount: true },
      _max: { amount: true },
    });

    return {
      totalAmount: Number(result._sum.amount) || 0,
      count: result._count || 0,
      avgAmount: Number(result._avg.amount) || 0,
      minAmount: Number(result._min.amount) || 0,
      maxAmount: Number(result._max.amount) || 0,
    };
  }

  /**
   * 获取按分类统计
   */
  async getStatsByCategory(filter: TransactionQueryFilter): Promise<CategoryStats[]> {
    const where = this.buildWhereClause(filter);

    const result = await this.prisma.transactions.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    // 计算总金额用于百分比
    const totalAmount = result.reduce(
      (sum: number, item: { _sum: { amount: unknown }; _count: number }) =>
        sum + (Number(item._sum.amount) || 0),
      0
    );

    return result
      .map((item: { category: string; _sum: { amount: unknown }; _count: number }) => ({
        category: item.category,
        totalAmount: Number(item._sum.amount) || 0,
        count: item._count,
        percentage: totalAmount > 0
          ? ((Number(item._sum.amount) || 0) / totalAmount) * 100
          : 0,
      }))
      .sort((a: { totalAmount: number }, b: { totalAmount: number }) => b.totalAmount - a.totalAmount);
  }

  /**
   * 批量创建交易
   */
  async createMany(transactions: CreateTransactionDTO[]): Promise<Transaction[]> {
    const data = transactions.map((t) => ({
      type: t.type,
      category: t.category,
      amount: t.amount,
      note: t.note,
      date: new Date(t.date),
      currency: t.currency || 'CNY',
      payment_method: t.payment_method,
      merchant: t.merchant,
      subcategory: t.subcategory,
      product: t.product,
    }));

    // Prisma 的 createMany 不返回创建的记录，需要用事务
    const created = await this.prisma.$transaction(
      data.map((item) => this.prisma.transactions.create({ data: item }))
    );

    return created.map(this.mapToEntity);
  }

  /**
   * 检查交易是否存在
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.transactions.count({
      where: {
        id,
        deleted_at: null,
      },
    });

    return count > 0;
  }

  /**
   * 获取最近的 N 条交易
   */
  async findRecent(limit: number, type?: TransactionType): Promise<Transaction[]> {
    const data = await this.prisma.transactions.findMany({
      where: {
        deleted_at: null,
        ...(type && { type }),
      },
      orderBy: [
        { date: 'desc' },
        { created_at: 'desc' },
      ],
      take: limit,
    });

    return data.map(this.mapToEntity);
  }

  /**
   * 构建 Prisma where 条件
   */
  private buildWhereClause(filter: TransactionQueryFilter): Prisma.transactionsWhereInput {
    const where: Prisma.transactionsWhereInput = {};

    if (!filter.includeDeleted) {
      where.deleted_at = null;
    }

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.category) {
      where.category = filter.category;
    }

    if (filter.startDate || filter.endDate) {
      where.date = {};
      if (filter.startDate) {
        where.date.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.date.lt = new Date(filter.endDate);
      }
    }

    if (filter.currency) {
      where.currency = filter.currency;
    }

    if (filter.paymentMethod) {
      where.payment_method = filter.paymentMethod;
    }

    if (filter.merchant) {
      where.merchant = filter.merchant;
    }

    if (filter.subcategory) {
      where.subcategory = filter.subcategory;
    }

    if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
      where.amount = {};
      if (filter.minAmount !== undefined) {
        where.amount.gte = filter.minAmount;
      }
      if (filter.maxAmount !== undefined) {
        where.amount.lte = filter.maxAmount;
      }
    }

    return where;
  }

  /**
   * 将数据库记录映射为领域实体
   */
  private mapToEntity(row: any): Transaction {
    return {
      id: row.id,
      type: row.type,
      category: row.category,
      amount: Number(row.amount),
      note: row.note,
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
      created_at: row.created_at?.toISOString?.() || row.created_at,
      currency: row.currency || 'CNY',
      payment_method: row.payment_method,
      merchant: row.merchant,
      subcategory: row.subcategory,
      product: row.product,
    };
  }
}
