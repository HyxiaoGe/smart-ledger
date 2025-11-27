'use client';

/**
 * 分类上下文
 * 提供全局的分类数据访问，替代硬编码的 PRESET_CATEGORIES
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  getCategoriesWithStats,
  getSubcategories,
  getAllFrequentMerchants,
  type CategoryWithStats,
  type Subcategory,
  type MerchantSuggestion,
} from '@/lib/services/categoryService';
import { readJSON, writeJSON } from '@/lib/utils/storage';

// 缓存配置
const CATEGORIES_CACHE_KEY = 'categories-cache';
const MERCHANTS_CACHE_KEY = 'merchants-cache';
const SUBCATEGORIES_CACHE_KEY = 'subcategories-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

/**
 * 简化的分类信息（用于替代 PRESET_CATEGORIES）
 */
export interface CategoryMeta {
  key: string;
  label: string;
  icon: string;
  color: string;
}

/**
 * 分类上下文值
 */
interface CategoryContextValue {
  // 数据
  categories: CategoryWithStats[];
  categoryMap: Map<string, CategoryWithStats>;
  subcategories: Record<string, Subcategory[]>;
  merchants: Record<string, MerchantSuggestion[]>;

  // 状态
  isLoading: boolean;
  error: string | null;

  // 方法
  refresh: () => Promise<void>;
  getCategoryMeta: (key: string) => CategoryMeta;
  getCategoryLabel: (key: string) => string;
  getCategoryIcon: (key: string) => string;
  getCategoryColor: (key: string) => string;
  getSubcategoriesForCategory: (categoryKey: string) => Subcategory[];
  getMerchantsForCategory: (categoryKey: string) => string[];
}

/**
 * 默认分类元数据（用于找不到分类时的回退）
 */
const DEFAULT_CATEGORY_META: CategoryMeta = {
  key: 'other',
  label: '其他',
  icon: '📁',
  color: '#6B7280',
};

/**
 * 创建上下文
 */
const CategoryContext = createContext<CategoryContextValue | null>(null);

/**
 * 缓存数据结构
 */
interface CachePayload<T> {
  data: T;
  timestamp: number;
}

/**
 * 分类 Provider 组件
 */
export function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, Subcategory[]>>({});
  const [merchants, setMerchants] = useState<Record<string, MerchantSuggestion[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 从缓存加载数据
   */
  const loadFromCache = useCallback(() => {
    const categoriesCache = readJSON<CachePayload<CategoryWithStats[]> | null>(
      CATEGORIES_CACHE_KEY,
      null
    );
    const subcategoriesCache = readJSON<CachePayload<Record<string, Subcategory[]>> | null>(
      SUBCATEGORIES_CACHE_KEY,
      null
    );
    const merchantsCache = readJSON<CachePayload<Record<string, MerchantSuggestion[]>> | null>(
      MERCHANTS_CACHE_KEY,
      null
    );

    let needsFetch = false;
    const now = Date.now();

    if (categoriesCache && now - categoriesCache.timestamp < CACHE_TTL) {
      setCategories(categoriesCache.data);
    } else {
      needsFetch = true;
    }

    if (subcategoriesCache && now - subcategoriesCache.timestamp < CACHE_TTL) {
      setSubcategories(subcategoriesCache.data);
    }

    if (merchantsCache && now - merchantsCache.timestamp < CACHE_TTL) {
      setMerchants(merchantsCache.data);
    }

    return needsFetch;
  }, []);

  /**
   * 从服务端获取数据
   */
  const fetchFromServer = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 并行获取分类和商家数据
      const [categoriesData, merchantsData] = await Promise.all([
        getCategoriesWithStats({ is_active: true }),
        getAllFrequentMerchants(10),
      ]);

      // 获取每个分类的子分类
      const subcategoriesData: Record<string, Subcategory[]> = {};
      for (const category of categoriesData) {
        subcategoriesData[category.key] = await getSubcategories(category.key);
      }

      // 更新状态
      setCategories(categoriesData);
      setSubcategories(subcategoriesData);
      setMerchants(merchantsData);

      // 保存到缓存
      const now = Date.now();
      writeJSON(CATEGORIES_CACHE_KEY, { data: categoriesData, timestamp: now });
      writeJSON(SUBCATEGORIES_CACHE_KEY, { data: subcategoriesData, timestamp: now });
      writeJSON(MERCHANTS_CACHE_KEY, { data: merchantsData, timestamp: now });
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError(err instanceof Error ? err.message : '获取分类数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 刷新数据
   */
  const refresh = useCallback(async () => {
    await fetchFromServer();
  }, [fetchFromServer]);

  /**
   * 初始化加载
   */
  useEffect(() => {
    const needsFetch = loadFromCache();
    if (needsFetch) {
      fetchFromServer();
    } else {
      setIsLoading(false);
      // 后台静默刷新
      fetchFromServer();
    }
  }, [loadFromCache, fetchFromServer]);

  /**
   * 分类 Map（用于快速查找）
   */
  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryWithStats>();
    for (const category of categories) {
      map.set(category.key, category);
    }
    return map;
  }, [categories]);

  /**
   * 获取分类元数据
   */
  const getCategoryMeta = useCallback(
    (key: string): CategoryMeta => {
      const category = categoryMap.get(key);
      if (!category) return { ...DEFAULT_CATEGORY_META, key };

      return {
        key: category.key,
        label: category.label,
        icon: category.icon || '📁',
        color: category.color || '#6B7280',
      };
    },
    [categoryMap]
  );

  /**
   * 获取分类标签
   */
  const getCategoryLabel = useCallback(
    (key: string): string => {
      return categoryMap.get(key)?.label || key;
    },
    [categoryMap]
  );

  /**
   * 获取分类图标
   */
  const getCategoryIcon = useCallback(
    (key: string): string => {
      return categoryMap.get(key)?.icon || '📁';
    },
    [categoryMap]
  );

  /**
   * 获取分类颜色
   */
  const getCategoryColor = useCallback(
    (key: string): string => {
      return categoryMap.get(key)?.color || '#6B7280';
    },
    [categoryMap]
  );

  /**
   * 获取分类下的子分类
   */
  const getSubcategoriesForCategory = useCallback(
    (categoryKey: string): Subcategory[] => {
      return subcategories[categoryKey] || [];
    },
    [subcategories]
  );

  /**
   * 获取分类下的商家名称列表
   */
  const getMerchantsForCategory = useCallback(
    (categoryKey: string): string[] => {
      return (merchants[categoryKey] || []).map((m) => m.name);
    },
    [merchants]
  );

  /**
   * 上下文值
   */
  const contextValue = useMemo<CategoryContextValue>(
    () => ({
      categories,
      categoryMap,
      subcategories,
      merchants,
      isLoading,
      error,
      refresh,
      getCategoryMeta,
      getCategoryLabel,
      getCategoryIcon,
      getCategoryColor,
      getSubcategoriesForCategory,
      getMerchantsForCategory,
    }),
    [
      categories,
      categoryMap,
      subcategories,
      merchants,
      isLoading,
      error,
      refresh,
      getCategoryMeta,
      getCategoryLabel,
      getCategoryIcon,
      getCategoryColor,
      getSubcategoriesForCategory,
      getMerchantsForCategory,
    ]
  );

  return (
    <CategoryContext.Provider value={contextValue}>
      {children}
    </CategoryContext.Provider>
  );
}

/**
 * 使用分类上下文的 Hook
 */
export function useCategories(): CategoryContextValue {
  const context = useContext(CategoryContext);

  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }

  return context;
}

/**
 * 仅获取分类列表的简化 Hook
 */
export function useCategoryList() {
  const { categories, isLoading, error } = useCategories();
  return { categories, isLoading, error };
}

/**
 * 获取分类元数据的 Hook（用于替代 PRESET_CATEGORIES）
 */
export function useCategoryMeta(key: string): CategoryMeta {
  const { getCategoryMeta } = useCategories();
  return getCategoryMeta(key);
}

/**
 * 获取分类下子分类的 Hook
 */
export function useSubcategories(categoryKey: string): Subcategory[] {
  const { getSubcategoriesForCategory } = useCategories();
  return getSubcategoriesForCategory(categoryKey);
}

/**
 * 获取分类下商家列表的 Hook
 */
export function useMerchantSuggestions(categoryKey: string): string[] {
  const { getMerchantsForCategory } = useCategories();
  return getMerchantsForCategory(categoryKey);
}
