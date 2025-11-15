/**
 * Supabase 预算仓储实现
 * 实现 IBudgetRepository 接口，提供基于 Supabase 的预算数据访问
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Budget } from '@/lib/services/budgetService';
import type {
  IBudgetRepository,
  CreateBudgetDTO,
  UpdateBudgetDTO,
  BudgetQueryFilter
} from '@/lib/domain/repositories/IBudgetRepository';

/**
 * Supabase 预算仓储实现
 */
export class SupabaseBudgetRepository implements IBudgetRepository {
  private readonly tableName = 'budgets';

  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * 根据 ID 查找预算
   */
  async findById(id: string): Promise<Budget | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find budget by id: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 根据年月查找预算
   */
  async findByYearMonth(year: number, month: number): Promise<Budget[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .order('category_key', { ascending: true });

    if (error) {
      throw new Error(`Failed to find budgets by year and month: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * 根据条件查找预算
   */
  async findMany(filter: BudgetQueryFilter): Promise<Budget[]> {
    let query = this.supabase.from(this.tableName).select('*');

    if (filter.year !== undefined) {
      query = query.eq('year', filter.year);
    }

    if (filter.month !== undefined) {
      query = query.eq('month', filter.month);
    }

    if (filter.category_key !== undefined) {
      if (filter.category_key === null) {
        query = query.is('category_key', null);
      } else {
        query = query.eq('category_key', filter.category_key);
      }
    }

    if (filter.is_active !== undefined) {
      query = query.eq('is_active', filter.is_active);
    }

    query = query.order('year', { ascending: false }).order('month', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find budgets: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * 创建预算
   */
  async create(budget: CreateBudgetDTO): Promise<Budget> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        year: budget.year,
        month: budget.month,
        category_key: budget.category_key,
        amount: budget.amount,
        alert_threshold: budget.alert_threshold ?? 0.8,
        is_active: budget.is_active ?? true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create budget: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 更新预算
   */
  async update(id: string, budget: UpdateBudgetDTO): Promise<Budget> {
    const updateData: any = {};

    if (budget.amount !== undefined) updateData.amount = budget.amount;
    if (budget.alert_threshold !== undefined) updateData.alert_threshold = budget.alert_threshold;
    if (budget.is_active !== undefined) updateData.is_active = budget.is_active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update budget: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 删除预算
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete budget: ${error.message}`);
    }
  }

  /**
   * 检查预算是否存在
   */
  async exists(year: number, month: number, category_key?: string | null): Promise<boolean> {
    let query = this.supabase
      .from(this.tableName)
      .select('id')
      .eq('year', year)
      .eq('month', month);

    if (category_key !== undefined) {
      if (category_key === null) {
        query = query.is('category_key', null);
      } else {
        query = query.eq('category_key', category_key);
      }
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check budget existence: ${error.message}`);
    }

    return !!data;
  }

  /**
   * 批量创建预算
   */
  async createMany(budgets: CreateBudgetDTO[]): Promise<Budget[]> {
    const insertData = budgets.map((b) => ({
      year: b.year,
      month: b.month,
      category_key: b.category_key,
      amount: b.amount,
      alert_threshold: b.alert_threshold ?? 0.8,
      is_active: b.is_active ?? true
    }));

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (error) {
      throw new Error(`Failed to create budgets: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * 将数据库记录映射为领域实体
   */
  private mapToEntity(row: any): Budget {
    return {
      id: row.id,
      year: row.year,
      month: row.month,
      category_key: row.category_key,
      amount: Number(row.amount),
      alert_threshold: Number(row.alert_threshold),
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
