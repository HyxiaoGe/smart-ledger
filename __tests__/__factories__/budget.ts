/**
 * Budget 测试数据工厂
 */

import { faker } from '@faker-js/faker';

const CATEGORIES = ['food', 'transport', 'drink', 'daily', 'shopping', 'entertainment', 'subscription'];

export interface MockBudget {
  id: string;
  year: number;
  month: number;
  category_key: string | null;
  amount: number;
  alert_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MockBudgetStatus {
  id: string;
  category_key: string | null;
  category_label: string;
  category_icon: string | null;
  category_color: string | null;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  usage_percentage: number;
  alert_threshold: number;
  is_over_budget: boolean;
  is_near_limit: boolean;
  transaction_count: number;
}

/**
 * 创建单个 Mock Budget
 */
export function createMockBudget(overrides?: Partial<MockBudget>): MockBudget {
  const now = new Date();
  const amount = parseFloat(faker.finance.amount({ min: 500, max: 5000, dec: 2 }));

  return {
    id: faker.string.uuid(),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    category_key: faker.helpers.arrayElement([...CATEGORIES, null]),
    amount,
    alert_threshold: 0.8,
    is_active: true,
    created_at: faker.date.past().toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  };
}

/**
 * 创建多个 Mock Budget
 */
export function createMockBudgets(
  count: number,
  overrides?: Partial<MockBudget>
): MockBudget[] {
  return Array.from({ length: count }, () => createMockBudget(overrides));
}

/**
 * 创建总预算 (category_key = null)
 */
export function createMockTotalBudget(overrides?: Partial<MockBudget>): MockBudget {
  return createMockBudget({
    category_key: null,
    amount: parseFloat(faker.finance.amount({ min: 3000, max: 10000, dec: 2 })),
    ...overrides,
  });
}

/**
 * 创建分类预算
 */
export function createMockCategoryBudget(
  category: string,
  overrides?: Partial<MockBudget>
): MockBudget {
  return createMockBudget({
    category_key: category,
    ...overrides,
  });
}

/**
 * 创建 Mock Budget Status
 */
export function createMockBudgetStatus(overrides?: Partial<MockBudgetStatus>): MockBudgetStatus {
  const budgetAmount = parseFloat(faker.finance.amount({ min: 500, max: 5000, dec: 2 }));
  const spentAmount = parseFloat(faker.finance.amount({ min: 0, max: budgetAmount * 1.2, dec: 2 }));
  const remainingAmount = budgetAmount - spentAmount;
  const usagePercentage = (spentAmount / budgetAmount) * 100;
  const alertThreshold = 0.8;
  const isOverBudget = spentAmount > budgetAmount;
  const isNearLimit = !isOverBudget && usagePercentage >= alertThreshold * 100;

  return {
    id: faker.string.uuid(),
    category_key: faker.helpers.arrayElement([...CATEGORIES, null]),
    category_label: faker.commerce.department(),
    category_icon: null,
    category_color: null,
    budget_amount: budgetAmount,
    spent_amount: spentAmount,
    remaining_amount: remainingAmount,
    usage_percentage: usagePercentage,
    alert_threshold: alertThreshold,
    is_over_budget: isOverBudget,
    is_near_limit: isNearLimit,
    transaction_count: faker.number.int({ min: 0, max: 50 }),
    ...overrides,
  };
}

/**
 * 创建特定使用率的 Budget Status
 */
export function createMockBudgetStatusWithUsage(
  usagePercentage: number,
  overrides?: Partial<MockBudgetStatus>
): MockBudgetStatus {
  const budgetAmount = 1000;
  const spentAmount = (budgetAmount * usagePercentage) / 100;

  return createMockBudgetStatus({
    budget_amount: budgetAmount,
    spent_amount: spentAmount,
    remaining_amount: budgetAmount - spentAmount,
    usage_percentage: usagePercentage,
    is_over_budget: usagePercentage > 100,
    is_near_limit: usagePercentage >= 80 && usagePercentage <= 100,
    ...overrides,
  });
}
