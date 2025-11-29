/**
 * 分类服务（服务端版本）
 * 仅在服务端（API 路由）使用，支持 Prisma 切换
 *
 * 注意：客户端组件请使用 categoryService.ts
 */

import { getCategoryRepository } from '@/lib/infrastructure/repositories/index.server';
import type { ICategoryRepository } from '@/lib/domain/repositories/ICategoryRepository';
import { CacheDecorator, memoryCache } from '@/lib/infrastructure/cache';
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

// 重新导出类型
export type {
  Category,
  CategoryWithStats,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryQueryFilter,
  DeleteCategoryResult,
  CategoryUsageDetail,
  Subcategory,
  MerchantSuggestion,
};

/**
 * 服务端分类服务类
 * 带缓存支持，减少数据库查询
 */
class ServerCategoryService {
  private cacheDecorator: CacheDecorator;

  constructor() {
    this.cacheDecorator = new CacheDecorator(memoryCache, {
      ttl: 3600 * 1000, // 1小时缓存
      tags: ['categories'],
      debug: false,
    });
  }

  private get repository(): ICategoryRepository {
    return getCategoryRepository();
  }

  async getCategoriesWithStats(filter?: CategoryQueryFilter): Promise<CategoryWithStats[]> {
    const cacheKey = `categories:with-stats:${JSON.stringify(filter || {})}`;
    return this.cacheDecorator.wrap(cacheKey, () => this.repository.findAllWithStats(filter));
  }

  async getActiveCategories(): Promise<Category[]> {
    const cacheKey = 'categories:active';
    return this.cacheDecorator.wrap(cacheKey, () => this.repository.findAll({ is_active: true }));
  }

  async getExpenseCategories(): Promise<Category[]> {
    const cacheKey = 'categories:expense';
    return this.cacheDecorator.wrap(cacheKey, () => this.repository.findAll({ type: 'expense', is_active: true }));
  }

  async getCategoryByKey(key: string): Promise<Category | null> {
    return this.repository.findByKey(key);
  }

  async addCustomCategory(params: CreateCategoryDTO): Promise<Category> {
    const exists = await this.repository.existsByKey(params.key);
    if (exists) {
      throw new Error(`分类 key "${params.key}" 已存在`);
    }
    const result = await this.repository.create(params);
    this.invalidateCache();
    return result;
  }

  async updateCategory(id: string, params: UpdateCategoryDTO): Promise<Category> {
    const result = await this.repository.update(id, params);
    this.invalidateCache();
    return result;
  }

  async deleteCategory(id: string, migrateToKey?: string): Promise<DeleteCategoryResult> {
    const result = await this.repository.delete(id, migrateToKey);
    this.invalidateCache();
    return result;
  }

  /**
   * 失效分类缓存
   */
  private invalidateCache(): void {
    this.cacheDecorator.invalidateByTag('categories');
  }

  async getCategoryUsageDetail(key: string): Promise<CategoryUsageDetail> {
    return this.repository.getUsageDetail(key);
  }

  async getSubcategories(categoryKey: string): Promise<Subcategory[]> {
    return this.repository.getSubcategories(categoryKey);
  }

  /**
   * 获取所有子分类
   * 优化：使用批量查询替代 N+1 循环查询
   * 原来: N+1 次查询 → 现在: 1 次查询
   */
  async getAllSubcategories(): Promise<Record<string, Subcategory[]>> {
    const cacheKey = 'categories:all-subcategories';
    return this.cacheDecorator.wrap(cacheKey, () => this.repository.getAllSubcategoriesBatch());
  }

  async getFrequentMerchants(categoryKey: string, limit?: number): Promise<MerchantSuggestion[]> {
    return this.repository.getFrequentMerchants(categoryKey, limit);
  }

  async getAllFrequentMerchants(limit?: number): Promise<Record<string, MerchantSuggestion[]>> {
    const cacheKey = `categories:all-frequent-merchants:${limit || 10}`;
    return this.cacheDecorator.wrap(
      cacheKey,
      () => this.repository.getAllFrequentMerchants(limit),
      { ttl: 1800 * 1000 } // 30分钟缓存（商户数据更新较频繁）
    );
  }

  async updateSortOrder(items: { id: string; sort_order: number }[]): Promise<void> {
    return this.repository.updateSortOrder(items);
  }

  async getCategoryMeta(key: string): Promise<{ label: string; icon: string; color: string } | null> {
    const category = await this.repository.findByKey(key);
    if (!category) return null;

    return {
      label: category.label,
      icon: category.icon || '📁',
      color: category.color || '#6B7280',
    };
  }
}

// 创建单例服务实例
const serverCategoryService = new ServerCategoryService();

// 导出服务方法
export const getCategoriesWithStats = (filter?: CategoryQueryFilter) =>
  serverCategoryService.getCategoriesWithStats(filter);

export const getActiveCategories = () => serverCategoryService.getActiveCategories();

export const getExpenseCategories = () => serverCategoryService.getExpenseCategories();

export const getCategoryByKey = (key: string) => serverCategoryService.getCategoryByKey(key);

export const addCustomCategory = (params: CreateCategoryDTO) =>
  serverCategoryService.addCustomCategory(params);

export const updateCategory = (id: string, params: UpdateCategoryDTO) =>
  serverCategoryService.updateCategory(id, params);

export const deleteCategory = (id: string, migrateToKey?: string) =>
  serverCategoryService.deleteCategory(id, migrateToKey);

export const getCategoryUsageDetail = (key: string) =>
  serverCategoryService.getCategoryUsageDetail(key);

export const getSubcategories = (categoryKey: string) =>
  serverCategoryService.getSubcategories(categoryKey);

export const getAllSubcategories = () => serverCategoryService.getAllSubcategories();

export const getFrequentMerchants = (categoryKey: string, limit?: number) =>
  serverCategoryService.getFrequentMerchants(categoryKey, limit);

export const getAllFrequentMerchants = (limit?: number) =>
  serverCategoryService.getAllFrequentMerchants(limit);

export const updateCategorySortOrder = (items: { id: string; sort_order: number }[]) =>
  serverCategoryService.updateSortOrder(items);

export const getCategoryMeta = (key: string) => serverCategoryService.getCategoryMeta(key);

// 导出服务实例
export { serverCategoryService };
