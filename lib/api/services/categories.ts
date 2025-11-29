/**
 * 分类 API 服务
 */

import { apiClient, buildQueryString } from '../client';
import type {
  CategoryWithStats,
  Subcategory,
  MerchantSuggestion,
} from '@/types/dto/category.dto';

/**
 * 分类列表查询参数
 */
export interface CategoryListParams {
  is_active?: boolean;
}

/**
 * 创建/更新分类参数
 */
export interface UpsertCategoryParams {
  key: string;
  label: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * 分类 API 服务
 */
export const categoriesApi = {
  /**
   * 获取分类列表（带统计信息）
   */
  list(params?: CategoryListParams): Promise<CategoryWithStats[]> {
    const query = buildQueryString(params || {});
    return apiClient.get<CategoryWithStats[]>(`/api/categories${query}`);
  },

  /**
   * 创建分类
   */
  create(data: UpsertCategoryParams): Promise<CategoryWithStats> {
    return apiClient.post<CategoryWithStats>('/api/categories', data);
  },

  /**
   * 更新分类
   */
  update(id: string, data: Partial<UpsertCategoryParams>): Promise<CategoryWithStats> {
    return apiClient.put<CategoryWithStats>(`/api/categories/${id}`, data);
  },

  /**
   * 获取子分类
   * @param categoryKey 分类 key，不传则返回所有分类的子分类
   */
  getSubcategories(categoryKey?: string): Promise<Subcategory[] | Record<string, Subcategory[]>> {
    const query = categoryKey ? `?category=${encodeURIComponent(categoryKey)}` : '';
    return apiClient.get(`/api/categories/subcategories${query}`);
  },

  /**
   * 获取所有分类的子分类（批量）
   */
  getAllSubcategories(): Promise<Record<string, Subcategory[]>> {
    return apiClient.get<Record<string, Subcategory[]>>('/api/categories/subcategories');
  },

  /**
   * 获取常见商家
   */
  getMerchants(limit: number = 10): Promise<Record<string, MerchantSuggestion[]>> {
    return apiClient.get<Record<string, MerchantSuggestion[]>>(
      `/api/categories/merchants?limit=${limit}`
    );
  },

  /**
   * 更新分类排序
   */
  updateSortOrder(orders: Array<{ id: string; sort_order: number }>): Promise<void> {
    return apiClient.put<void>('/api/categories/sort-order', { orders });
  },

  /**
   * 删除分类
   */
  delete(id: string, migrateToKey?: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/api/categories/${id}`, {
      data: { migrateToKey }
    });
  },
};
