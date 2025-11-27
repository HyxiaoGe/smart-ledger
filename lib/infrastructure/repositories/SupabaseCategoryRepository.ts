/**
 * Supabase 分类仓储实现
 * 实现 ICategoryRepository 接口，提供基于 Supabase 的分类数据访问
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ICategoryRepository } from '@/lib/domain/repositories/ICategoryRepository';
import type {
  Category,
  CategoryWithStats,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryQueryFilter,
  DeleteCategoryResult,
  CategoryUsageDetail,
  Subcategory,
  MerchantSuggestion,
} from '@/types/dto/category.dto';

/**
 * Supabase 分类仓储实现
 */
export class SupabaseCategoryRepository implements ICategoryRepository {
  private readonly tableName = 'categories';

  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * 根据 ID 查找分类
   */
  async findById(id: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find category by id: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 根据 key 查找分类
   */
  async findByKey(key: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find category by key: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * 获取所有分类
   */
  async findAll(filter?: CategoryQueryFilter): Promise<Category[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .order('sort_order', { ascending: true });

    if (filter?.type) {
      query = query.or(`type.eq.${filter.type},type.eq.both`);
    }

    if (filter?.is_active !== undefined) {
      query = query.eq('is_active', filter.is_active);
    }

    if (filter?.is_system !== undefined) {
      query = query.eq('is_system', filter.is_system);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find categories: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  /**
   * 获取所有分类（含使用统计）
   * 使用 RPC 函数获取带统计信息的分类
   */
  async findAllWithStats(filter?: CategoryQueryFilter): Promise<CategoryWithStats[]> {
    const { data, error } = await this.supabase.rpc('get_categories_with_stats');

    if (error) {
      throw new Error(`Failed to get categories with stats: ${error.message}`);
    }

    let categories = (data || []).map(this.mapToEntityWithStats);

    // 应用过滤器
    if (filter?.type) {
      categories = categories.filter(
        (c) => c.type === filter.type || c.type === 'both'
      );
    }

    if (filter?.is_active !== undefined) {
      categories = categories.filter((c) => c.is_active === filter.is_active);
    }

    if (filter?.is_system !== undefined) {
      categories = categories.filter((c) => c.is_system === filter.is_system);
    }

    return categories;
  }

  /**
   * 创建分类
   */
  async create(category: CreateCategoryDTO): Promise<Category> {
    const { data, error } = await this.supabase.rpc('add_custom_category', {
      p_key: category.key,
      p_label: category.label,
      p_icon: category.icon || '📁',
      p_color: category.color || '#6B7280',
      p_type: category.type || 'expense',
    });

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    // RPC 返回的是新创建的分类 ID，需要再查询一次获取完整数据
    const created = await this.findById(data);
    if (!created) {
      throw new Error('Failed to retrieve created category');
    }

    return created;
  }

  /**
   * 更新分类
   */
  async update(id: string, category: UpdateCategoryDTO): Promise<Category> {
    const { data, error } = await this.supabase.rpc('update_category', {
      p_id: id,
      p_label: category.label || null,
      p_icon: category.icon || null,
      p_color: category.color || null,
      p_is_active: category.is_active !== undefined ? category.is_active : null,
      p_sort_order: category.sort_order !== undefined ? category.sort_order : null,
    });

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    if (!data) {
      throw new Error('Category update returned no data');
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated category');
    }

    return updated;
  }

  /**
   * 删除分类
   */
  async delete(id: string, migrateToKey?: string): Promise<DeleteCategoryResult> {
    const { data, error } = await this.supabase.rpc('delete_category', {
      p_id: id,
      p_migrate_to_key: migrateToKey || null,
    });

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }

    return data?.[0] || { success: false, message: 'Unknown error', affected_transactions: 0 };
  }

  /**
   * 获取分类使用详情
   */
  async getUsageDetail(key: string): Promise<CategoryUsageDetail> {
    const { data, error } = await this.supabase.rpc('get_category_usage_detail', {
      p_key: key,
    });

    if (error) {
      throw new Error(`Failed to get category usage detail: ${error.message}`);
    }

    return data?.[0] || {
      total_transactions: 0,
      total_amount: 0,
      avg_amount: 0,
      first_used: null,
      last_used: null,
      this_month_count: 0,
      this_month_amount: 0,
    };
  }

  /**
   * 检查分类 key 是否存在
   */
  async existsByKey(key: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check category existence: ${error.message}`);
    }

    return !!data;
  }

  /**
   * 批量更新排序
   */
  async updateSortOrder(items: { id: string; sort_order: number }[]): Promise<void> {
    for (const item of items) {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) {
        throw new Error(`Failed to update sort order: ${error.message}`);
      }
    }
  }

  /**
   * 获取分类下的子分类列表
   * 从数据库 subcategories 表读取
   */
  async getSubcategories(categoryKey: string): Promise<Subcategory[]> {
    const { data, error } = await this.supabase
      .from('subcategories')
      .select('key, label, category_key')
      .eq('category_key', categoryKey)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get subcategories: ${error.message}`);
    }

    return (data || []).map((row) => ({
      key: row.key,
      label: row.label,
      category_key: row.category_key,
    }));
  }

  /**
   * 获取分类下的常用商家
   * 合并 common_notes 预设商家和 transactions 历史商家
   */
  async getFrequentMerchants(categoryKey: string, limit: number = 10): Promise<MerchantSuggestion[]> {
    // 并行获取预设商家和历史商家
    const [commonNotesResult, transactionsResult] = await Promise.all([
      this.supabase
        .from('common_notes')
        .select('note, usage_count')
        .eq('category_affinity', categoryKey)
        .eq('is_active', true)
        .order('usage_count', { ascending: false }),
      this.supabase
        .from('transactions')
        .select('merchant')
        .eq('category', categoryKey)
        .not('merchant', 'is', null)
        .is('deleted_at', null)
    ]);

    if (commonNotesResult.error) {
      throw new Error(`Failed to get common notes: ${commonNotesResult.error.message}`);
    }
    if (transactionsResult.error) {
      throw new Error(`Failed to get frequent merchants: ${transactionsResult.error.message}`);
    }

    // 合并商家数据，common_notes 优先
    const merchantCounts = new Map<string, number>();

    // 先添加预设商家
    for (const row of commonNotesResult.data || []) {
      if (row.note) {
        merchantCounts.set(row.note, row.usage_count || 0);
      }
    }

    // 再添加历史商家（累加使用次数）
    for (const row of transactionsResult.data || []) {
      if (row.merchant) {
        const count = merchantCounts.get(row.merchant) || 0;
        merchantCounts.set(row.merchant, count + 1);
      }
    }

    // 排序并返回
    return Array.from(merchantCounts.entries())
      .map(([name, usage_count]) => ({
        name,
        category_key: categoryKey,
        usage_count,
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);
  }

  /**
   * 获取所有分类的常用商家
   * 合并 common_notes 预设商家和 transactions 历史商家
   */
  async getAllFrequentMerchants(limit: number = 10): Promise<Record<string, MerchantSuggestion[]>> {
    // 并行获取预设商家和历史商家
    const [commonNotesResult, transactionsResult] = await Promise.all([
      this.supabase
        .from('common_notes')
        .select('note, category_affinity, usage_count')
        .eq('is_active', true)
        .not('category_affinity', 'is', null),
      this.supabase
        .from('transactions')
        .select('category, merchant')
        .not('merchant', 'is', null)
        .is('deleted_at', null)
    ]);

    if (commonNotesResult.error) {
      throw new Error(`Failed to get common notes: ${commonNotesResult.error.message}`);
    }
    if (transactionsResult.error) {
      throw new Error(`Failed to get all frequent merchants: ${transactionsResult.error.message}`);
    }

    // 按分类统计商家
    const merchantsByCategory = new Map<string, Map<string, number>>();

    // 先添加预设商家
    for (const row of commonNotesResult.data || []) {
      if (row.note && row.category_affinity) {
        if (!merchantsByCategory.has(row.category_affinity)) {
          merchantsByCategory.set(row.category_affinity, new Map());
        }
        const categoryMerchants = merchantsByCategory.get(row.category_affinity)!;
        categoryMerchants.set(row.note, row.usage_count || 0);
      }
    }

    // 再添加历史商家（累加使用次数）
    for (const row of transactionsResult.data || []) {
      if (row.merchant && row.category) {
        if (!merchantsByCategory.has(row.category)) {
          merchantsByCategory.set(row.category, new Map());
        }
        const categoryMerchants = merchantsByCategory.get(row.category)!;
        const count = categoryMerchants.get(row.merchant) || 0;
        categoryMerchants.set(row.merchant, count + 1);
      }
    }

    // 转换为结果格式
    const result: Record<string, MerchantSuggestion[]> = {};

    for (const [category, merchants] of merchantsByCategory) {
      result[category] = Array.from(merchants.entries())
        .map(([name, usage_count]) => ({
          name,
          category_key: category,
          usage_count,
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit);
    }

    return result;
  }

  /**
   * 将数据库记录映射为领域实体
   */
  private mapToEntity(row: any): Category {
    return {
      id: row.id,
      key: row.key,
      label: row.label,
      icon: row.icon,
      color: row.color,
      type: row.type,
      is_system: row.is_system,
      is_active: row.is_active,
      sort_order: row.sort_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * 将数据库记录映射为带统计的领域实体
   */
  private mapToEntityWithStats(row: any): CategoryWithStats {
    return {
      id: row.id,
      key: row.key,
      label: row.label,
      icon: row.icon,
      color: row.color,
      type: row.type,
      is_system: row.is_system,
      is_active: row.is_active,
      sort_order: row.sort_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
      usage_count: row.usage_count || 0,
      last_used: row.last_used,
      total_amount: row.total_amount || 0,
    };
  }
}
