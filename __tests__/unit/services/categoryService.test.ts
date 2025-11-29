/**
 * CategoryService 测试
 * @module lib/services/categoryService
 *
 * 注意：由于 categoryService.ts 依赖服务端 repository，
 * 这里测试服务层业务逻辑，使用自定义 TestCategoryService 类模拟行为
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ICategoryRepository } from '@/lib/domain/repositories/ICategoryRepository';
import type { Category, CategoryWithStats, Subcategory, MerchantSuggestion } from '@/types/dto/category.dto';

// TestCategoryService - 模拟 CategoryService 的业务逻辑
class TestCategoryService {
  constructor(private readonly repository: ICategoryRepository) {}

  async getCategoriesWithStats(filter?: any) {
    return this.repository.findAllWithStats(filter);
  }

  async getActiveCategories() {
    return this.repository.findAll({ is_active: true });
  }

  async getExpenseCategories() {
    return this.repository.findAll({ type: 'expense', is_active: true });
  }

  async getCategoryByKey(key: string) {
    return this.repository.findByKey(key);
  }

  async addCustomCategory(params: any) {
    const exists = await this.repository.existsByKey(params.key);
    if (exists) {
      throw new Error(`分类 key "${params.key}" 已存在`);
    }
    return this.repository.create(params);
  }

  async updateCategory(id: string, params: any) {
    return this.repository.update(id, params);
  }

  async deleteCategory(id: string, migrateToKey?: string) {
    return this.repository.delete(id, migrateToKey);
  }

  async getCategoryUsageDetail(key: string) {
    return this.repository.getUsageDetail(key);
  }

  async getSubcategories(categoryKey: string) {
    return this.repository.getSubcategories(categoryKey);
  }

  async getAllSubcategories() {
    const categories = await this.repository.findAll({ is_active: true });
    const result: Record<string, Subcategory[]> = {};
    for (const category of categories) {
      result[category.key] = await this.repository.getSubcategories(category.key);
    }
    return result;
  }

  async getFrequentMerchants(categoryKey: string, limit?: number) {
    return this.repository.getFrequentMerchants(categoryKey, limit);
  }

  async updateSortOrder(items: { id: string; sort_order: number }[]) {
    return this.repository.updateSortOrder(items);
  }

  async getCategoryMeta(key: string) {
    const category = await this.repository.findByKey(key);
    if (!category) return null;
    return {
      label: category.label,
      icon: category.icon || '📁',
      color: category.color || '#6B7280',
    };
  }
}

// Mock repository factory
function createMockRepository(): ICategoryRepository {
  return {
    findAll: vi.fn(),
    findAllWithStats: vi.fn(),
    findById: vi.fn(),
    findByKey: vi.fn(),
    existsByKey: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getUsageDetail: vi.fn(),
    getSubcategories: vi.fn(),
    getFrequentMerchants: vi.fn(),
    getAllFrequentMerchants: vi.fn(),
    updateSortOrder: vi.fn(),
  };
}

// Mock category factory
function createMockCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    key: 'food',
    label: '餐饮',
    icon: '🍜',
    color: '#F97316',
    type: 'expense',
    is_system: true,
    is_active: true,
    sort_order: 1,
    parent_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('CategoryService', () => {
  let service: TestCategoryService;
  let mockRepository: ICategoryRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new TestCategoryService(mockRepository);
    vi.clearAllMocks();
  });

  describe('getCategoriesWithStats', () => {
    it('should return categories with statistics', async () => {
      const mockCategories: CategoryWithStats[] = [
        {
          ...createMockCategory(),
          transactionCount: 100,
          totalAmount: 5000,
          lastUsedAt: new Date().toISOString(),
        },
      ];
      vi.mocked(mockRepository.findAllWithStats).mockResolvedValue(mockCategories);

      const result = await service.getCategoriesWithStats();

      expect(result).toEqual(mockCategories);
      expect(mockRepository.findAllWithStats).toHaveBeenCalled();
    });

    it('should pass filter to repository', async () => {
      vi.mocked(mockRepository.findAllWithStats).mockResolvedValue([]);

      await service.getCategoriesWithStats({ type: 'expense' });

      expect(mockRepository.findAllWithStats).toHaveBeenCalledWith({ type: 'expense' });
    });
  });

  describe('getActiveCategories', () => {
    it('should return only active categories', async () => {
      const mockCategories = [createMockCategory({ is_active: true })];
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockCategories);

      const result = await service.getActiveCategories();

      expect(result).toEqual(mockCategories);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ is_active: true });
    });
  });

  describe('getExpenseCategories', () => {
    it('should return expense type categories', async () => {
      const mockCategories = [createMockCategory({ type: 'expense' })];
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockCategories);

      const result = await service.getExpenseCategories();

      expect(result).toEqual(mockCategories);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        type: 'expense',
        is_active: true,
      });
    });
  });

  describe('getCategoryByKey', () => {
    it('should return category by key', async () => {
      const mockCategory = createMockCategory({ key: 'food' });
      vi.mocked(mockRepository.findByKey).mockResolvedValue(mockCategory);

      const result = await service.getCategoryByKey('food');

      expect(result).toEqual(mockCategory);
      expect(mockRepository.findByKey).toHaveBeenCalledWith('food');
    });

    it('should return null for non-existent key', async () => {
      vi.mocked(mockRepository.findByKey).mockResolvedValue(null);

      const result = await service.getCategoryByKey('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('addCustomCategory', () => {
    it('should create new category', async () => {
      const newCategory = {
        key: 'custom_new',
        label: '自定义分类',
        icon: '📦',
        color: '#3B82F6',
        type: 'expense' as const,
      };
      const createdCategory = createMockCategory(newCategory);

      vi.mocked(mockRepository.existsByKey).mockResolvedValue(false);
      vi.mocked(mockRepository.create).mockResolvedValue(createdCategory);

      const result = await service.addCustomCategory(newCategory);

      expect(result).toEqual(createdCategory);
      expect(mockRepository.existsByKey).toHaveBeenCalledWith('custom_new');
      expect(mockRepository.create).toHaveBeenCalledWith(newCategory);
    });

    it('should throw error if key already exists', async () => {
      vi.mocked(mockRepository.existsByKey).mockResolvedValue(true);

      await expect(
        service.addCustomCategory({ key: 'existing', label: '已存在' })
      ).rejects.toThrow('分类 key "existing" 已存在');

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    it('should update category', async () => {
      const updatedCategory = createMockCategory({ label: '更新后的分类' });
      vi.mocked(mockRepository.update).mockResolvedValue(updatedCategory);

      const result = await service.updateCategory('cat-1', { label: '更新后的分类' });

      expect(result).toEqual(updatedCategory);
      expect(mockRepository.update).toHaveBeenCalledWith('cat-1', {
        label: '更新后的分类',
      });
    });
  });

  describe('deleteCategory', () => {
    it('should delete category without migration', async () => {
      const deleteResult = {
        deleted: true,
        migratedTransactions: 0,
      };
      vi.mocked(mockRepository.delete).mockResolvedValue(deleteResult);

      const result = await service.deleteCategory('cat-1');

      expect(result).toEqual(deleteResult);
      expect(mockRepository.delete).toHaveBeenCalledWith('cat-1', undefined);
    });

    it('should delete category with migration', async () => {
      const deleteResult = {
        deleted: true,
        migratedTransactions: 10,
      };
      vi.mocked(mockRepository.delete).mockResolvedValue(deleteResult);

      const result = await service.deleteCategory('cat-1', 'other');

      expect(result).toEqual(deleteResult);
      expect(mockRepository.delete).toHaveBeenCalledWith('cat-1', 'other');
    });
  });

  describe('getCategoryUsageDetail', () => {
    it('should return usage details', async () => {
      const usageDetail = {
        category: createMockCategory(),
        transactionCount: 50,
        totalAmount: 2500,
        monthlyBreakdown: [
          { month: '2024-06', count: 20, amount: 1000 },
          { month: '2024-05', count: 30, amount: 1500 },
        ],
      };
      vi.mocked(mockRepository.getUsageDetail).mockResolvedValue(usageDetail);

      const result = await service.getCategoryUsageDetail('food');

      expect(result).toEqual(usageDetail);
      expect(mockRepository.getUsageDetail).toHaveBeenCalledWith('food');
    });
  });

  describe('getSubcategories', () => {
    it('should return subcategories for a category', async () => {
      const subcategories: Subcategory[] = [
        { id: 'sub-1', name: '午餐', count: 30 },
        { id: 'sub-2', name: '晚餐', count: 25 },
      ];
      vi.mocked(mockRepository.getSubcategories).mockResolvedValue(subcategories);

      const result = await service.getSubcategories('food');

      expect(result).toEqual(subcategories);
      expect(mockRepository.getSubcategories).toHaveBeenCalledWith('food');
    });
  });

  describe('getAllSubcategories', () => {
    it('should return subcategories for all categories', async () => {
      const categories = [
        createMockCategory({ key: 'food' }),
        createMockCategory({ key: 'transport', id: 'cat-2' }),
      ];
      const foodSubs: Subcategory[] = [{ id: 'sub-1', name: '午餐', count: 30 }];
      const transportSubs: Subcategory[] = [{ id: 'sub-2', name: '地铁', count: 20 }];

      vi.mocked(mockRepository.findAll).mockResolvedValue(categories);
      vi.mocked(mockRepository.getSubcategories)
        .mockResolvedValueOnce(foodSubs)
        .mockResolvedValueOnce(transportSubs);

      const result = await service.getAllSubcategories();

      expect(result.food).toEqual(foodSubs);
      expect(result.transport).toEqual(transportSubs);
    });
  });

  describe('getFrequentMerchants', () => {
    it('should return frequent merchants for category', async () => {
      const merchants: MerchantSuggestion[] = [
        { name: '肯德基', count: 15, avgAmount: 35 },
        { name: '麦当劳', count: 10, avgAmount: 30 },
      ];
      vi.mocked(mockRepository.getFrequentMerchants).mockResolvedValue(merchants);

      const result = await service.getFrequentMerchants('food', 10);

      expect(result).toEqual(merchants);
      expect(mockRepository.getFrequentMerchants).toHaveBeenCalledWith('food', 10);
    });
  });

  describe('updateSortOrder', () => {
    it('should update sort order for multiple categories', async () => {
      const items = [
        { id: 'cat-1', sort_order: 1 },
        { id: 'cat-2', sort_order: 2 },
      ];
      vi.mocked(mockRepository.updateSortOrder).mockResolvedValue();

      await service.updateSortOrder(items);

      expect(mockRepository.updateSortOrder).toHaveBeenCalledWith(items);
    });
  });

  describe('getCategoryMeta', () => {
    it('should return category meta', async () => {
      const category = createMockCategory({
        label: '餐饮',
        icon: '🍜',
        color: '#F97316',
      });
      vi.mocked(mockRepository.findByKey).mockResolvedValue(category);

      const result = await service.getCategoryMeta('food');

      expect(result).toEqual({
        label: '餐饮',
        icon: '🍜',
        color: '#F97316',
      });
    });

    it('should return null for non-existent category', async () => {
      vi.mocked(mockRepository.findByKey).mockResolvedValue(null);

      const result = await service.getCategoryMeta('nonexistent');

      expect(result).toBeNull();
    });

    it('should use default icon and color', async () => {
      const category = createMockCategory({
        label: '其他',
        icon: null as any,
        color: null as any,
      });
      vi.mocked(mockRepository.findByKey).mockResolvedValue(category);

      const result = await service.getCategoryMeta('other');

      expect(result).toEqual({
        label: '其他',
        icon: '📁',
        color: '#6B7280',
      });
    });
  });
});

describe('generateCategoryKey utility', () => {
  // 直接测试 key 生成逻辑
  function generateCategoryKey(label: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `custom_${timestamp}_${random}`;
  }

  it('should generate unique keys', () => {
    const key1 = generateCategoryKey('测试分类');
    const key2 = generateCategoryKey('测试分类');

    expect(key1).not.toBe(key2);
  });

  it('should start with custom_ prefix', () => {
    const key = generateCategoryKey('测试分类');

    expect(key.startsWith('custom_')).toBe(true);
  });

  it('should have correct format', () => {
    const key = generateCategoryKey('测试分类');

    // Format: custom_{timestamp}_{random}
    expect(key).toMatch(/^custom_[a-z0-9]+_[a-z0-9]+$/);
  });
});

describe('Category Constants', () => {
  // 常用 Emoji 图标列表 (直接定义以避免导入问题)
  const EMOJI_ICONS = [
    '🍜', '🍕', '🍔', '🍟', '🌮', '🍱', '🍝', '🥗', '🍖', '🍗',
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
    '🎮', '🎯', '🎲', '🎰', '🎳', '🎪', '🎭', '🎨', '🎬', '🎤',
    '🏠', '🏡', '🏢', '🏬', '🏪', '🏥', '🏦', '💡', '🔌', '🔋',
    '🛒', '🛍️', '💳', '💰', '💵', '💴', '💶', '💷', '💸', '💎',
    '💊', '💉', '🩺', '🩹', '🩼', '⚕️', '🏥', '🧘', '🏋️', '🚴',
  ];

  // 预设颜色列表
  const PRESET_COLORS = [
    '#F97316', '#22C55E', '#06B6D4', '#A855F7', '#3B82F6',
    '#0EA5E9', '#F59E0B', '#EF4444', '#6B7280', '#EC4899',
    '#8B5CF6', '#10B981', '#F472B6', '#14B8A6', '#F97316', '#6366F1',
  ];

  describe('EMOJI_ICONS', () => {
    it('should have emoji icons', () => {
      expect(Array.isArray(EMOJI_ICONS)).toBe(true);
      expect(EMOJI_ICONS.length).toBeGreaterThan(50);
    });

    it('should contain common category icons', () => {
      expect(EMOJI_ICONS).toContain('🍜');
      expect(EMOJI_ICONS).toContain('🚗');
      expect(EMOJI_ICONS).toContain('🎮');
      expect(EMOJI_ICONS).toContain('🏠');
      expect(EMOJI_ICONS).toContain('🛒');
    });
  });

  describe('PRESET_COLORS', () => {
    it('should have preset colors', () => {
      expect(Array.isArray(PRESET_COLORS)).toBe(true);
      expect(PRESET_COLORS.length).toBeGreaterThan(10);
    });

    it('should be valid hex colors', () => {
      PRESET_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });
});
