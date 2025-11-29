/**
 * 分类仓储接口
 * 定义所有分类数据访问的标准接口
 */

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
 * 分类仓储接口
 */
export interface ICategoryRepository {
  /**
   * 根据 ID 查找分类
   */
  findById(id: string): Promise<Category | null>;

  /**
   * 根据 key 查找分类
   */
  findByKey(key: string): Promise<Category | null>;

  /**
   * 获取所有分类
   */
  findAll(filter?: CategoryQueryFilter): Promise<Category[]>;

  /**
   * 获取所有分类（含使用统计）
   */
  findAllWithStats(filter?: CategoryQueryFilter): Promise<CategoryWithStats[]>;

  /**
   * 创建分类
   */
  create(category: CreateCategoryDTO): Promise<Category>;

  /**
   * 更新分类
   */
  update(id: string, category: UpdateCategoryDTO): Promise<Category>;

  /**
   * 删除分类
   * @param id 分类 ID
   * @param migrateToKey 将该分类下的交易迁移到的目标分类 key
   */
  delete(id: string, migrateToKey?: string): Promise<DeleteCategoryResult>;

  /**
   * 获取分类使用详情
   */
  getUsageDetail(key: string): Promise<CategoryUsageDetail>;

  /**
   * 检查分类 key 是否存在
   */
  existsByKey(key: string): Promise<boolean>;

  /**
   * 批量更新排序
   */
  updateSortOrder(items: { id: string; sort_order: number }[]): Promise<void>;

  /**
   * 获取分类下的子分类列表
   */
  getSubcategories(categoryKey: string): Promise<Subcategory[]>;

  /**
   * 批量获取所有子分类（一次查询）
   * 避免 N+1 查询问题
   */
  getAllSubcategoriesBatch(): Promise<Record<string, Subcategory[]>>;

  /**
   * 获取分类下的常用商家
   * 从 transactions 表中提取
   */
  getFrequentMerchants(categoryKey: string, limit?: number): Promise<MerchantSuggestion[]>;

  /**
   * 获取所有分类的常用商家
   */
  getAllFrequentMerchants(limit?: number): Promise<Record<string, MerchantSuggestion[]>>;
}
