/**
 * Transaction 测试数据工厂
 */

import { faker } from '@faker-js/faker';
import type { Transaction, TransactionType, Currency } from '@/types/domain/transaction';
import type { CreateTransactionDTO, UpdateTransactionDTO } from '@/types/dto/transaction.dto';

const CATEGORIES = ['food', 'transport', 'drink', 'daily', 'shopping', 'entertainment', 'subscription'];
const PAYMENT_METHODS = ['cash', 'wechat', 'alipay', 'credit_card', 'debit_card'];

/**
 * 创建单个 Mock Transaction
 */
export function createMockTransaction(overrides?: Partial<Transaction>): Transaction {
  const date = faker.date.recent({ days: 30 });
  return {
    id: faker.string.uuid(),
    type: 'expense' as TransactionType,
    category: faker.helpers.arrayElement(CATEGORIES),
    amount: parseFloat(faker.finance.amount({ min: 1, max: 500, dec: 2 })),
    note: faker.lorem.words({ min: 1, max: 4 }),
    date: date.toISOString().slice(0, 10),
    created_at: date.toISOString(),
    currency: 'CNY' as Currency,
    payment_method: faker.helpers.arrayElement([...PAYMENT_METHODS, null]),
    merchant: faker.helpers.maybe(() => faker.company.name(), { probability: 0.5 }) ?? null,
    subcategory: null,
    product: null,
    ...overrides,
  };
}

/**
 * 创建多个 Mock Transaction
 */
export function createMockTransactions(
  count: number,
  overrides?: Partial<Transaction>
): Transaction[] {
  return Array.from({ length: count }, () => createMockTransaction(overrides));
}

/**
 * 创建 CreateTransactionDTO
 */
export function createMockTransactionDTO(
  overrides?: Partial<CreateTransactionDTO>
): CreateTransactionDTO {
  return {
    type: 'expense' as TransactionType,
    category: faker.helpers.arrayElement(CATEGORIES),
    amount: parseFloat(faker.finance.amount({ min: 1, max: 500, dec: 2 })),
    note: faker.lorem.words({ min: 1, max: 4 }),
    date: faker.date.recent({ days: 30 }).toISOString().slice(0, 10),
    currency: 'CNY' as Currency,
    payment_method: faker.helpers.arrayElement([...PAYMENT_METHODS, undefined]),
    merchant: faker.helpers.maybe(() => faker.company.name(), { probability: 0.3 }),
    ...overrides,
  };
}

/**
 * 创建 UpdateTransactionDTO
 */
export function createMockUpdateTransactionDTO(
  overrides?: Partial<UpdateTransactionDTO>
): UpdateTransactionDTO {
  return {
    amount: parseFloat(faker.finance.amount({ min: 1, max: 500, dec: 2 })),
    note: faker.lorem.words({ min: 1, max: 4 }),
    ...overrides,
  };
}

/**
 * 创建特定分类的交易
 */
export function createMockTransactionByCategory(
  category: string,
  overrides?: Partial<Transaction>
): Transaction {
  return createMockTransaction({ category, ...overrides });
}

/**
 * 创建指定日期范围内的交易
 */
export function createMockTransactionsInDateRange(
  count: number,
  startDate: Date,
  endDate: Date,
  overrides?: Partial<Transaction>
): Transaction[] {
  return Array.from({ length: count }, () => {
    const date = faker.date.between({ from: startDate, to: endDate });
    return createMockTransaction({
      date: date.toISOString().slice(0, 10),
      created_at: date.toISOString(),
      ...overrides,
    });
  });
}

/**
 * 创建指定月份的交易
 */
export function createMockTransactionsForMonth(
  count: number,
  year: number,
  month: number,
  overrides?: Partial<Transaction>
): Transaction[] {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  return createMockTransactionsInDateRange(count, startDate, endDate, overrides);
}
