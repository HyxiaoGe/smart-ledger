/**
 * 分类服务
 * 提供分类相关的业务逻辑，使用 Repository 模式访问数据
 */

import { categoryRepository } from '@/lib/infrastructure/repositories';
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

// 重新导出类型，保持向后兼容
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
 * 分类服务类
 * 封装所有分类相关的业务逻辑
 */
class CategoryService {
  constructor(private readonly repository: ICategoryRepository) {}

  /**
   * 获取所有分类（含使用统计）
   */
  async getCategoriesWithStats(filter?: CategoryQueryFilter): Promise<CategoryWithStats[]> {
    return this.repository.findAllWithStats(filter);
  }

  /**
   * 获取所有活跃分类
   */
  async getActiveCategories(): Promise<Category[]> {
    return this.repository.findAll({ is_active: true });
  }

  /**
   * 获取支出类型的分类
   */
  async getExpenseCategories(): Promise<Category[]> {
    return this.repository.findAll({ type: 'expense', is_active: true });
  }

  /**
   * 根据 key 获取分类
   */
  async getCategoryByKey(key: string): Promise<Category | null> {
    return this.repository.findByKey(key);
  }

  /**
   * 添加自定义分类
   */
  async addCustomCategory(params: CreateCategoryDTO): Promise<Category> {
    // 检查 key 是否已存在
    const exists = await this.repository.existsByKey(params.key);
    if (exists) {
      throw new Error(`分类 key "${params.key}" 已存在`);
    }

    return this.repository.create(params);
  }

  /**
   * 更新分类
   */
  async updateCategory(id: string, params: UpdateCategoryDTO): Promise<Category> {
    return this.repository.update(id, params);
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: string, migrateToKey?: string): Promise<DeleteCategoryResult> {
    return this.repository.delete(id, migrateToKey);
  }

  /**
   * 获取分类使用详情
   */
  async getCategoryUsageDetail(key: string): Promise<CategoryUsageDetail> {
    return this.repository.getUsageDetail(key);
  }

  /**
   * 获取分类下的子分类
   */
  async getSubcategories(categoryKey: string): Promise<Subcategory[]> {
    return this.repository.getSubcategories(categoryKey);
  }

  /**
   * 获取所有分类的子分类映射
   */
  async getAllSubcategories(): Promise<Record<string, Subcategory[]>> {
    const categories = await this.repository.findAll({ is_active: true });
    const result: Record<string, Subcategory[]> = {};

    for (const category of categories) {
      result[category.key] = await this.repository.getSubcategories(category.key);
    }

    return result;
  }

  /**
   * 获取分类下的常用商家
   */
  async getFrequentMerchants(categoryKey: string, limit?: number): Promise<MerchantSuggestion[]> {
    return this.repository.getFrequentMerchants(categoryKey, limit);
  }

  /**
   * 获取所有分类的常用商家
   */
  async getAllFrequentMerchants(limit?: number): Promise<Record<string, MerchantSuggestion[]>> {
    return this.repository.getAllFrequentMerchants(limit);
  }

  /**
   * 批量更新分类排序
   */
  async updateSortOrder(items: { id: string; sort_order: number }[]): Promise<void> {
    return this.repository.updateSortOrder(items);
  }

  /**
   * 获取分类的显示信息（label、icon、color）
   */
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
const categoryService = new CategoryService(categoryRepository);

// 导出服务方法（保持向后兼容的函数式 API）
export const getCategoriesWithStats = (filter?: CategoryQueryFilter) =>
  categoryService.getCategoriesWithStats(filter);

export const getActiveCategories = () => categoryService.getActiveCategories();

export const getExpenseCategories = () => categoryService.getExpenseCategories();

export const getCategoryByKey = (key: string) => categoryService.getCategoryByKey(key);

export const addCustomCategory = (params: CreateCategoryDTO) =>
  categoryService.addCustomCategory(params);

export const updateCategory = (id: string, params: UpdateCategoryDTO) =>
  categoryService.updateCategory(id, params);

export const deleteCategory = (id: string, migrateToKey?: string) =>
  categoryService.deleteCategory(id, migrateToKey);

export const getCategoryUsageDetail = (key: string) =>
  categoryService.getCategoryUsageDetail(key);

export const getSubcategories = (categoryKey: string) =>
  categoryService.getSubcategories(categoryKey);

export const getAllSubcategories = () => categoryService.getAllSubcategories();

export const getFrequentMerchants = (categoryKey: string, limit?: number) =>
  categoryService.getFrequentMerchants(categoryKey, limit);

export const getAllFrequentMerchants = (limit?: number) =>
  categoryService.getAllFrequentMerchants(limit);

export const updateCategorySortOrder = (items: { id: string; sort_order: number }[]) =>
  categoryService.updateSortOrder(items);

export const getCategoryMeta = (key: string) => categoryService.getCategoryMeta(key);

// 导出服务实例（供需要完整服务对象的场景使用）
export { categoryService };

/**
 * 常用 Emoji 图标列表
 */
export const EMOJI_ICONS = [
  // 食物饮料
  '🍜', '🍕', '🍔', '🍟', '🌮', '🍱', '🍝', '🥗', '🍖', '🍗',
  '🥤', '☕', '🍵', '🧃', '🥛', '🍺', '🍷', '🍹', '🧋',
  // 交通
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
  '🚛', '🚚', '🚜', '🛴', '🚲', '🛵', '🏍️', '✈️', '🚁', '⛵',
  '🚂', '🚆', '🚇', '🚈', '🚝', '🚄', '🚅', '🚞',
  // 娱乐
  '🎮', '🎯', '🎲', '🎰', '🎳', '🎪', '🎭', '🎨', '🎬', '🎤',
  '🎧', '🎼', '🎹', '🎸', '🥁', '🎺', '🎷', '📻', '📺', '📷',
  // 生活
  '🏠', '🏡', '🏢', '🏬', '🏪', '🏥', '🏦', '💡', '🔌', '🔋',
  '🛏️', '🛋️', '🚪', '🪟', '🚿', '🛁', '🚽', '🧹', '🧺', '🧼',
  // 购物
  '🛒', '🛍️', '💳', '💰', '💵', '💴', '💶', '💷', '💸', '💎',
  '👔', '👕', '👖', '👗', '👘', '👚', '👙', '👠', '👡', '👢',
  // 健康
  '💊', '💉', '🩺', '🩹', '🩼', '⚕️', '🏥', '🧘', '🏋️', '🚴',
  // 工作学习
  '💼', '📝', '📚', '📖', '📕', '📗', '📘', '📙', '📓', '📔',
  '✏️', '✒️', '🖊️', '🖋️', '🖍️', '📌', '📍', '📎', '📏', '📐',
  // 其他
  '📦', '📫', '📪', '📬', '📭', '📮', '📁', '🗂️', '🗃️', '🗄️',
  '🎁', '🎈', '🎊', '🎉', '🎀', '🪅', '🎐', '🧧', '💌', '❤️',
];

/**
 * 预设颜色列表
 */
export const PRESET_COLORS = [
  '#F97316', // 橙色
  '#22C55E', // 绿色
  '#06B6D4', // 青色
  '#A855F7', // 紫色
  '#3B82F6', // 蓝色
  '#0EA5E9', // 天蓝
  '#F59E0B', // 黄色
  '#EF4444', // 红色
  '#6B7280', // 灰色
  '#EC4899', // 粉色
  '#8B5CF6', // 靛紫
  '#10B981', // 翠绿
  '#F472B6', // 玫红
  '#14B8A6', // 蓝绿
  '#F97316', // 橘红
  '#6366F1', // 靛蓝
];

/**
 * 生成分类键（从 label 转换）
 */
export function generateCategoryKey(label: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  return `custom_${timestamp}_${random}`;
}
