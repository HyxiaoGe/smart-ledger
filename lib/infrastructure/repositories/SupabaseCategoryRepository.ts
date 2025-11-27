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
 * 子分类硬编码定义（后续可迁移到数据库）
 */
const SUBCATEGORY_DEFINITIONS: Record<string, Subcategory[]> = {
  food: [
    { key: 'breakfast', label: '早餐', category_key: 'food' },
    { key: 'lunch', label: '午餐', category_key: 'food' },
    { key: 'dinner', label: '晚餐', category_key: 'food' },
    { key: 'takeout', label: '外卖', category_key: 'food' },
    { key: 'dine_in', label: '堂食', category_key: 'food' },
    { key: 'gathering', label: '聚餐', category_key: 'food' },
    { key: 'snack', label: '零食小吃', category_key: 'food' },
  ],
  drink: [
    { key: 'coffee', label: '咖啡', category_key: 'drink' },
    { key: 'milk_tea', label: '奶茶', category_key: 'drink' },
    { key: 'tea', label: '茶饮', category_key: 'drink' },
    { key: 'juice', label: '果汁', category_key: 'drink' },
    { key: 'water', label: '饮用水', category_key: 'drink' },
    { key: 'milk', label: '奶制品', category_key: 'drink' },
  ],
  transport: [
    { key: 'subway', label: '地铁', category_key: 'transport' },
    { key: 'taxi', label: '出租车/网约车', category_key: 'transport' },
    { key: 'bus', label: '公交', category_key: 'transport' },
    { key: 'bike', label: '共享单车', category_key: 'transport' },
    { key: 'train', label: '火车/高铁', category_key: 'transport' },
    { key: 'flight', label: '飞机', category_key: 'transport' },
  ],
  entertainment: [
    { key: 'movie', label: '电影', category_key: 'entertainment' },
    { key: 'game', label: '游戏', category_key: 'entertainment' },
    { key: 'sport', label: '运动', category_key: 'entertainment' },
    { key: 'music', label: '音乐', category_key: 'entertainment' },
    { key: 'book', label: '图书', category_key: 'entertainment' },
  ],
  daily: [
    { key: 'groceries', label: '生鲜食材', category_key: 'daily' },
    { key: 'household', label: '日用品', category_key: 'daily' },
    { key: 'personal', label: '个人护理', category_key: 'daily' },
    { key: 'snack', label: '零食', category_key: 'daily' },
  ],
  subscription: [
    { key: 'software', label: '软件订阅', category_key: 'subscription' },
    { key: 'service', label: '会员服务', category_key: 'subscription' },
    { key: 'network', label: '网络服务', category_key: 'subscription' },
    { key: 'telecom', label: '话费', category_key: 'subscription' },
    { key: 'media', label: '流媒体', category_key: 'subscription' },
  ],
  shopping: [
    { key: 'online', label: '网购', category_key: 'shopping' },
    { key: 'clothes', label: '服装', category_key: 'shopping' },
    { key: 'electronics', label: '电子产品', category_key: 'shopping' },
    { key: 'books', label: '图书', category_key: 'shopping' },
    { key: 'beauty', label: '美妆', category_key: 'shopping' },
  ],
  medical: [
    { key: 'hospital', label: '医院', category_key: 'medical' },
    { key: 'pharmacy', label: '药品', category_key: 'medical' },
    { key: 'checkup', label: '体检', category_key: 'medical' },
  ],
  utilities: [
    { key: 'utility', label: '水电费', category_key: 'utilities' },
    { key: 'gas', label: '燃气费', category_key: 'utilities' },
    { key: 'property', label: '物业费', category_key: 'utilities' },
  ],
};

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
   * 目前使用硬编码，后续可迁移到数据库
   */
  async getSubcategories(categoryKey: string): Promise<Subcategory[]> {
    return SUBCATEGORY_DEFINITIONS[categoryKey] || [];
  }

  /**
   * 获取分类下的常用商家
   * 从 transactions 表中提取
   */
  async getFrequentMerchants(categoryKey: string, limit: number = 10): Promise<MerchantSuggestion[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('merchant')
      .eq('category', categoryKey)
      .not('merchant', 'is', null)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to get frequent merchants: ${error.message}`);
    }

    // 统计商家出现次数
    const merchantCounts = new Map<string, number>();
    for (const row of data || []) {
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
   */
  async getAllFrequentMerchants(limit: number = 10): Promise<Record<string, MerchantSuggestion[]>> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('category, merchant')
      .not('merchant', 'is', null)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to get all frequent merchants: ${error.message}`);
    }

    // 按分类统计商家
    const merchantsByCategory = new Map<string, Map<string, number>>();

    for (const row of data || []) {
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
