/**
 * 分类服务（服务端版本）
 * 仅在服务端（API 路由）使用，支持 Prisma 切换
 *
 * 注意：客户端组件请使用 categoryService.ts
 */

import { getCategoryRepository } from '@/lib/infrastructure/repositories/index.server';
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
 */
class ServerCategoryService {
  private get repository(): ICategoryRepository {
    return getCategoryRepository();
  }

  async getCategoriesWithStats(filter?: CategoryQueryFilter): Promise<CategoryWithStats[]> {
    return this.repository.findAllWithStats(filter);
  }

  async getActiveCategories(): Promise<Category[]> {
    return this.repository.findAll({ is_active: true });
  }

  async getExpenseCategories(): Promise<Category[]> {
    return this.repository.findAll({ type: 'expense', is_active: true });
  }

  async getCategoryByKey(key: string): Promise<Category | null> {
    return this.repository.findByKey(key);
  }

  async addCustomCategory(params: CreateCategoryDTO): Promise<Category> {
    const exists = await this.repository.existsByKey(params.key);
    if (exists) {
      throw new Error(`分类 key "${params.key}" 已存在`);
    }
    return this.repository.create(params);
  }

  async updateCategory(id: string, params: UpdateCategoryDTO): Promise<Category> {
    return this.repository.update(id, params);
  }

  async deleteCategory(id: string, migrateToKey?: string): Promise<DeleteCategoryResult> {
    return this.repository.delete(id, migrateToKey);
  }

  async getCategoryUsageDetail(key: string): Promise<CategoryUsageDetail> {
    return this.repository.getUsageDetail(key);
  }

  async getSubcategories(categoryKey: string): Promise<Subcategory[]> {
    return this.repository.getSubcategories(categoryKey);
  }

  async getAllSubcategories(): Promise<Record<string, Subcategory[]>> {
    const categories = await this.repository.findAll({ is_active: true });
    const result: Record<string, Subcategory[]> = {};

    for (const category of categories) {
      result[category.key] = await this.repository.getSubcategories(category.key);
    }

    return result;
  }

  async getFrequentMerchants(categoryKey: string, limit?: number): Promise<MerchantSuggestion[]> {
    return this.repository.getFrequentMerchants(categoryKey, limit);
  }

  async getAllFrequentMerchants(limit?: number): Promise<Record<string, MerchantSuggestion[]>> {
    return this.repository.getAllFrequentMerchants(limit);
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
