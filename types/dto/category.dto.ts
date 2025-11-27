/**
 * 分类 DTO 类型定义
 * 用于数据传输和接口定义
 */

/**
 * 分类实体
 */
export interface Category {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  color: string | null;
  type: 'income' | 'expense' | 'both';
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * 分类（含使用统计）
 */
export interface CategoryWithStats extends Category {
  usage_count: number;
  last_used: string | null;
  total_amount: number;
}

/**
 * 创建分类 DTO
 */
export interface CreateCategoryDTO {
  key: string;
  label: string;
  icon?: string;
  color?: string;
  type?: 'income' | 'expense' | 'both';
  sort_order?: number;
}

/**
 * 更新分类 DTO
 */
export interface UpdateCategoryDTO {
  label?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * 分类查询过滤器
 */
export interface CategoryQueryFilter {
  type?: 'income' | 'expense' | 'both';
  is_active?: boolean;
  is_system?: boolean;
}

/**
 * 删除分类结果
 */
export interface DeleteCategoryResult {
  success: boolean;
  message: string;
  affected_transactions: number;
}

/**
 * 分类使用详情
 */
export interface CategoryUsageDetail {
  total_transactions: number;
  total_amount: number;
  avg_amount: number;
  first_used: string | null;
  last_used: string | null;
  this_month_count: number;
  this_month_amount: number;
}

/**
 * 子分类定义
 */
export interface Subcategory {
  key: string;
  label: string;
  category_key: string;
}

/**
 * 商家建议
 */
export interface MerchantSuggestion {
  name: string;
  category_key: string;
  usage_count: number;
}
