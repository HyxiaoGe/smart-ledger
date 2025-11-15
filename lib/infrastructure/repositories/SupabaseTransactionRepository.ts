/**
 * Supabase 交易仓储实现
 * 实现 ITransactionRepository 接口，提供基于 Supabase 的数据访问
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Transaction, TransactionType } from '@/types/transaction';
import type {
  ITransactionRepository,
  TransactionQueryFilter,
  TransactionSortOptions,
  PaginationOptions,
  PaginatedResult,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionStats,
  CategoryStats
} from '@/lib/domain/repositories/ITransactionRepository';

/**
 * Supabase 交易仓储实现
 */
export class SupabaseTransactionRepository implements ITransactionRepository {
  private readonly tableName = 'transactions';

  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * 根据 ID 查找交易
   */
  async findById(id: string): Promise<Transaction | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 未找到记录
        return null;
      }
      throw new Error(`Failed to find transaction by id: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 根据条件查找交易列表
   */
  async findMany(
    filter: TransactionQueryFilter,
    sort?: TransactionSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Transaction>> {
    let query = this.supabase.from(this.tableName).select('*', { count: 'exact' });

    // 应用过滤条件
    query = this.applyFilters(query, filter);

    // 应用排序
    if (sort) {
      query = query.order(sort.field, { ascending: sort.order === 'asc' });
    } else {
      query = query.order('date', { ascending: false });
    }

    // 应用分页
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.pageSize;
      query = query.range(offset, offset + pagination.pageSize - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to find transactions: ${error.message}`);
    }

    const transactions = (data || []).map(this.mapToEntity);
    const total = count || 0;
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || transactions.length;

    return {
      data: transactions,
      total,
      page,
      pageSize,
      hasMore: total > page * pageSize
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
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .is('deleted_at', null)
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find transactions by date range: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
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
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        note: transaction.note,
        date: transaction.date,
        currency: transaction.currency || 'CNY',
        payment_method: transaction.payment_method,
        merchant: transaction.merchant,
        subcategory: transaction.subcategory,
        product: transaction.product
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 更新交易
   */
  async update(id: string, transaction: UpdateTransactionDTO): Promise<Transaction> {
    const updateData: any = {};

    // 只更新提供的字段
    if (transaction.type !== undefined) updateData.type = transaction.type;
    if (transaction.category !== undefined) updateData.category = transaction.category;
    if (transaction.amount !== undefined) updateData.amount = transaction.amount;
    if (transaction.note !== undefined) updateData.note = transaction.note;
    if (transaction.date !== undefined) updateData.date = transaction.date;
    if (transaction.currency !== undefined) updateData.currency = transaction.currency;
    if (transaction.payment_method !== undefined)
      updateData.payment_method = transaction.payment_method;
    if (transaction.merchant !== undefined) updateData.merchant = transaction.merchant;
    if (transaction.subcategory !== undefined) updateData.subcategory = transaction.subcategory;
    if (transaction.product !== undefined) updateData.product = transaction.product;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update transaction: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 软删除交易
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to soft delete transaction: ${error.message}`);
    }
  }

  /**
   * 硬删除交易
   */
  async hardDelete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to hard delete transaction: ${error.message}`);
    }
  }

  /**
   * 恢复已删除的交易
   */
  async restore(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to restore transaction: ${error.message}`);
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(filter: TransactionQueryFilter): Promise<TransactionStats> {
    let query = this.supabase.from(this.tableName).select('amount');

    query = this.applyFilters(query, filter);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get transaction stats: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        totalAmount: 0,
        count: 0,
        avgAmount: 0,
        minAmount: 0,
        maxAmount: 0
      };
    }

    const amounts = data.map((t: any) => Number(t.amount));
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);

    return {
      totalAmount,
      count: amounts.length,
      avgAmount: totalAmount / amounts.length,
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts)
    };
  }

  /**
   * 获取按分类统计
   */
  async getStatsByCategory(filter: TransactionQueryFilter): Promise<CategoryStats[]> {
    let query = this.supabase.from(this.tableName).select('category, amount');

    query = this.applyFilters(query, filter);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get category stats: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 按分类聚合
    const categoryMap = new Map<string, { totalAmount: number; count: number }>();

    data.forEach((t: any) => {
      const existing = categoryMap.get(t.category) || { totalAmount: 0, count: 0 };
      categoryMap.set(t.category, {
        totalAmount: existing.totalAmount + Number(t.amount),
        count: existing.count + 1
      });
    });

    // 计算总金额用于百分比
    const totalAmount = Array.from(categoryMap.values()).reduce(
      (sum, stats) => sum + stats.totalAmount,
      0
    );

    // 转换为 CategoryStats 数组
    return Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        totalAmount: stats.totalAmount,
        count: stats.count,
        percentage: totalAmount > 0 ? (stats.totalAmount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * 批量创建交易
   */
  async createMany(transactions: CreateTransactionDTO[]): Promise<Transaction[]> {
    const insertData = transactions.map((t) => ({
      type: t.type,
      category: t.category,
      amount: t.amount,
      note: t.note,
      date: t.date,
      currency: t.currency || 'CNY',
      payment_method: t.payment_method,
      merchant: t.merchant,
      subcategory: t.subcategory,
      product: t.product
    }));

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (error) {
      throw new Error(`Failed to create transactions: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * 检查交易是否存在
   */
  async exists(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check transaction existence: ${error.message}`);
    }

    return !!data;
  }

  /**
   * 获取最近的 N 条交易
   */
  async findRecent(limit: number, type?: TransactionType): Promise<Transaction[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find recent transactions: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * 应用查询过滤条件
   */
  private applyFilters(query: any, filter: TransactionQueryFilter): any {
    if (!filter.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (filter.type) {
      query = query.eq('type', filter.type);
    }

    if (filter.category) {
      query = query.eq('category', filter.category);
    }

    if (filter.startDate) {
      query = query.gte('date', filter.startDate);
    }

    if (filter.endDate) {
      query = query.lt('date', filter.endDate);
    }

    if (filter.currency) {
      query = query.eq('currency', filter.currency);
    }

    if (filter.paymentMethod) {
      query = query.eq('payment_method', filter.paymentMethod);
    }

    if (filter.merchant) {
      query = query.eq('merchant', filter.merchant);
    }

    if (filter.subcategory) {
      query = query.eq('subcategory', filter.subcategory);
    }

    if (filter.minAmount !== undefined) {
      query = query.gte('amount', filter.minAmount);
    }

    if (filter.maxAmount !== undefined) {
      query = query.lte('amount', filter.maxAmount);
    }

    return query;
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
      date: row.date,
      created_at: row.created_at,
      currency: row.currency || 'CNY',
      payment_method: row.payment_method,
      merchant: row.merchant,
      subcategory: row.subcategory,
      product: row.product
    };
  }
}
