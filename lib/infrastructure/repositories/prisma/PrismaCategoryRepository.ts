/**
 * Prisma 分类仓储实现
 * 实现 ICategoryRepository 接口，提供基于 Prisma 的分类数据访问
 */

import type { PrismaClient, Prisma } from '@/generated/prisma/client';
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
 * Prisma 分类仓储实现
 */
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 根据 ID 查找分类
   */
  async findById(id: string): Promise<Category | null> {
    const data = await this.prisma.categories.findUnique({
      where: { id },
    });

    return data ? this.mapToEntity(data) : null;
  }

  /**
   * 根据 key 查找分类
   * 注意：categories.key 在数据库中没有唯一约束，使用 findFirst
   */
  async findByKey(key: string): Promise<Category | null> {
    const data = await this.prisma.categories.findFirst({
      where: { key },
    });

    return data ? this.mapToEntity(data) : null;
  }

  /**
   * 获取所有分类
   */
  async findAll(filter?: CategoryQueryFilter): Promise<Category[]> {
    const where: Prisma.categoriesWhereInput = {};

    if (filter?.type) {
      where.OR = [
        { type: filter.type },
        { type: 'both' },
      ];
    }

    if (filter?.is_active !== undefined) {
      where.is_active = filter.is_active;
    }

    if (filter?.is_system !== undefined) {
      where.is_system = filter.is_system;
    }

    const data = await this.prisma.categories.findMany({
      where,
      orderBy: { sort_order: 'asc' },
    });

    return data.map(this.mapToEntity);
  }

  /**
   * 获取所有分类（含使用统计）
   * 使用原生 SQL 调用 PostgreSQL 函数
   */
  async findAllWithStats(filter?: CategoryQueryFilter): Promise<CategoryWithStats[]> {
    // 调用 PostgreSQL 存储过程
    const data = await this.prisma.$queryRaw<any[]>`SELECT * FROM get_categories_with_stats()`;

    let categories = data.map(this.mapToEntityWithStats);

    // 应用过滤器
    if (filter?.type) {
      categories = categories.filter(
        (c: CategoryWithStats) => c.type === filter.type || c.type === 'both'
      );
    }

    if (filter?.is_active !== undefined) {
      categories = categories.filter((c: CategoryWithStats) => c.is_active === filter.is_active);
    }

    if (filter?.is_system !== undefined) {
      categories = categories.filter((c: CategoryWithStats) => c.is_system === filter.is_system);
    }

    return categories;
  }

  /**
   * 创建分类
   */
  async create(category: CreateCategoryDTO): Promise<Category> {
    // 调用 PostgreSQL 存储过程
    const result = await this.prisma.$queryRaw<{ add_custom_category: string }[]>`
      SELECT add_custom_category(
        ${category.key},
        ${category.label},
        ${category.icon || '📁'},
        ${category.color || '#6B7280'},
        ${category.type || 'expense'}
      )
    `;

    const newId = result[0]?.add_custom_category;
    if (!newId) {
      throw new Error('Failed to create category');
    }

    const created = await this.findById(newId);
    if (!created) {
      throw new Error('Failed to retrieve created category');
    }

    return created;
  }

  /**
   * 更新分类
   */
  async update(id: string, category: UpdateCategoryDTO): Promise<Category> {
    // 调用 PostgreSQL 存储过程
    await this.prisma.$queryRaw`
      SELECT update_category(
        ${id}::uuid,
        ${category.label || null},
        ${category.icon || null},
        ${category.color || null},
        ${category.is_active !== undefined ? category.is_active : null},
        ${category.sort_order !== undefined ? category.sort_order : null}
      )
    `;

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
    // 调用 PostgreSQL 存储过程
    const result = await this.prisma.$queryRaw<DeleteCategoryResult[]>`
      SELECT * FROM delete_category(${id}::uuid, ${migrateToKey || null})
    `;

    return result[0] || { success: false, message: 'Unknown error', affected_transactions: 0 };
  }

  /**
   * 获取分类使用详情
   */
  async getUsageDetail(key: string): Promise<CategoryUsageDetail> {
    // 调用 PostgreSQL 存储过程
    const result = await this.prisma.$queryRaw<CategoryUsageDetail[]>`
      SELECT * FROM get_category_usage_detail(${key})
    `;

    return result[0] || {
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
    const count = await this.prisma.categories.count({
      where: { key },
    });

    return count > 0;
  }

  /**
   * 批量更新排序
   */
  async updateSortOrder(items: { id: string; sort_order: number }[]): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.categories.update({
          where: { id: item.id },
          data: {
            sort_order: item.sort_order,
            updated_at: new Date(),
          },
        })
      )
    );
  }

  /**
   * 获取分类下的子分类列表
   */
  async getSubcategories(categoryKey: string): Promise<Subcategory[]> {
    const data = await this.prisma.subcategories.findMany({
      where: {
        category_key: categoryKey,
        is_active: true,
      },
      orderBy: { sort_order: 'asc' },
      select: {
        key: true,
        label: true,
        category_key: true,
      },
    });

    return data.map((row: { key: string; label: string; category_key: string }) => ({
      key: row.key,
      label: row.label,
      category_key: row.category_key,
    }));
  }

  /**
   * 批量获取所有子分类（一次查询）
   * 优化：避免 N+1 查询问题
   */
  async getAllSubcategoriesBatch(): Promise<Record<string, Subcategory[]>> {
    const data = await this.prisma.subcategories.findMany({
      where: {
        is_active: true,
      },
      orderBy: [
        { category_key: 'asc' },
        { sort_order: 'asc' },
      ],
      select: {
        key: true,
        label: true,
        category_key: true,
      },
    });

    // 按 category_key 分组
    const result: Record<string, Subcategory[]> = {};
    for (const row of data) {
      if (!result[row.category_key]) {
        result[row.category_key] = [];
      }
      result[row.category_key].push({
        key: row.key,
        label: row.label,
        category_key: row.category_key,
      });
    }

    return result;
  }

  /**
   * 获取分类下的常用商家
   */
  async getFrequentMerchants(categoryKey: string, limit: number = 10): Promise<MerchantSuggestion[]> {
    // 并行获取预设商家和历史商家
    const [commonNotes, transactions] = await Promise.all([
      this.prisma.common_notes.findMany({
        where: {
          category_affinity: categoryKey,
          is_active: true,
        },
        orderBy: { usage_count: 'desc' },
        select: {
          content: true,
          usage_count: true,
        },
      }),
      this.prisma.transactions.findMany({
        where: {
          category: categoryKey,
          merchant: { not: null },
          deleted_at: null,
        },
        select: { merchant: true },
      }),
    ]);

    // 合并商家数据
    const merchantCounts = new Map<string, number>();

    for (const row of commonNotes) {
      if (row.content) {
        merchantCounts.set(row.content, row.usage_count || 0);
      }
    }

    for (const row of transactions) {
      if (row.merchant) {
        const count = merchantCounts.get(row.merchant) || 0;
        merchantCounts.set(row.merchant, count + 1);
      }
    }

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
    // 并行获取预设商家和历史商家
    const [commonNotes, transactions] = await Promise.all([
      this.prisma.common_notes.findMany({
        where: {
          is_active: true,
          category_affinity: { not: null },
        },
        select: {
          content: true,
          category_affinity: true,
          usage_count: true,
        },
      }),
      this.prisma.transactions.findMany({
        where: {
          merchant: { not: null },
          deleted_at: null,
        },
        select: {
          category: true,
          merchant: true,
        },
      }),
    ]);

    // 按分类统计商家
    const merchantsByCategory = new Map<string, Map<string, number>>();

    for (const row of commonNotes) {
      if (row.content && row.category_affinity) {
        if (!merchantsByCategory.has(row.category_affinity)) {
          merchantsByCategory.set(row.category_affinity, new Map());
        }
        merchantsByCategory.get(row.category_affinity)!.set(row.content, row.usage_count || 0);
      }
    }

    for (const row of transactions) {
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
      created_at: row.created_at?.toISOString?.() || row.created_at,
      updated_at: row.updated_at?.toISOString?.() || row.updated_at,
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
      created_at: row.created_at?.toISOString?.() || row.created_at,
      updated_at: row.updated_at?.toISOString?.() || row.updated_at,
      usage_count: Number(row.usage_count) || 0,
      last_used: row.last_used?.toISOString?.() || row.last_used,
      total_amount: Number(row.total_amount) || 0,
    };
  }
}
