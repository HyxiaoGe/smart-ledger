/**
 * Category 测试数据工厂
 */

import { faker } from '@faker-js/faker';

export interface MockCategory {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  color: string | null;
  type: 'expense' | 'income';
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CATEGORIES = [
  { key: 'food', label: '餐饮', icon: '🍽️', color: '#FF6B6B' },
  { key: 'transport', label: '交通', icon: '🚇', color: '#4ECDC4' },
  { key: 'drink', label: '饮品', icon: '☕', color: '#45B7D1' },
  { key: 'daily', label: '日用', icon: '🧴', color: '#96CEB4' },
  { key: 'shopping', label: '购物', icon: '🛒', color: '#FFEAA7' },
  { key: 'entertainment', label: '娱乐', icon: '🎮', color: '#DDA0DD' },
  { key: 'subscription', label: '订阅', icon: '📱', color: '#98D8C8' },
];

/**
 * 创建单个 Mock Category
 */
export function createMockCategory(overrides?: Partial<MockCategory>): MockCategory {
  const now = new Date();
  const defaultCat = faker.helpers.arrayElement(DEFAULT_CATEGORIES);

  return {
    id: faker.string.uuid(),
    key: defaultCat.key,
    label: defaultCat.label,
    icon: defaultCat.icon,
    color: defaultCat.color,
    type: 'expense',
    sort_order: faker.number.int({ min: 0, max: 100 }),
    is_active: true,
    created_at: faker.date.past().toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  };
}

/**
 * 创建多个 Mock Category
 */
export function createMockCategories(
  count: number,
  overrides?: Partial<MockCategory>
): MockCategory[] {
  return Array.from({ length: count }, (_, index) =>
    createMockCategory({
      sort_order: index,
      ...overrides,
    })
  );
}

/**
 * 创建所有默认分类
 */
export function createDefaultCategories(): MockCategory[] {
  return DEFAULT_CATEGORIES.map((cat, index) =>
    createMockCategory({
      key: cat.key,
      label: cat.label,
      icon: cat.icon,
      color: cat.color,
      sort_order: index,
    })
  );
}

/**
 * 根据 key 创建分类
 */
export function createMockCategoryByKey(
  key: string,
  overrides?: Partial<MockCategory>
): MockCategory {
  const defaultCat = DEFAULT_CATEGORIES.find((c) => c.key === key) || {
    key,
    label: key,
    icon: null,
    color: null,
  };

  return createMockCategory({
    key: defaultCat.key,
    label: defaultCat.label,
    icon: defaultCat.icon,
    color: defaultCat.color,
    ...overrides,
  });
}

/**
 * 创建收入类型分类
 */
export function createMockIncomeCategory(overrides?: Partial<MockCategory>): MockCategory {
  return createMockCategory({
    type: 'income',
    key: 'salary',
    label: '工资',
    icon: '💰',
    color: '#2ECC71',
    ...overrides,
  });
}
