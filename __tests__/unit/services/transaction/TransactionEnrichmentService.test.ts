import { describe, expect, it, vi } from 'vitest';
import { TransactionEnrichmentService } from '@/lib/services/transaction/TransactionEnrichmentService';
import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type { ICommonNoteRepository } from '@/lib/domain/repositories/ICommonNoteRepository';
import type { ICategoryRepository } from '@/lib/domain/repositories/ICategoryRepository';
import type { IPaymentMethodRepository } from '@/lib/domain/repositories/IPaymentMethodRepository';
import type { Transaction } from '@/types/domain/transaction';

function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    category: 'food',
    amount: 18,
    note: '瑞幸咖啡',
    date: '2024-06-15',
    currency: 'CNY',
    payment_method: 'pm-wechat',
    merchant: '瑞幸咖啡',
    subcategory: 'coffee',
    product: '生椰拿铁',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockTransactionRepository(): ITransactionRepository {
  return {
    findById: vi.fn(),
    findMany: vi.fn(),
    findByDateRange: vi.fn(),
    findByMonth: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
    restore: vi.fn(),
    getStats: vi.fn(),
    getStatsByCategory: vi.fn(),
    createMany: vi.fn(),
    exists: vi.fn(),
    findRecent: vi.fn(),
  };
}

function createMockCommonNoteRepository(): ICommonNoteRepository {
  return {
    findById: vi.fn(),
    findByContent: vi.fn(),
    findMany: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    incrementUsageCount: vi.fn(),
    updateLastUsed: vi.fn(),
    upsert: vi.fn(),
    findMostUsed: vi.fn(),
    exists: vi.fn(),
  };
}

function createMockCategoryRepository(): ICategoryRepository {
  return {
    findById: vi.fn(),
    findByKey: vi.fn(),
    findAll: vi.fn(),
    findAllWithStats: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getUsageDetail: vi.fn(),
    existsByKey: vi.fn(),
    updateSortOrder: vi.fn(),
    getSubcategories: vi.fn(),
    getAllSubcategoriesBatch: vi.fn(),
    getFrequentMerchants: vi.fn(),
    getAllFrequentMerchants: vi.fn(),
  };
}

function createMockPaymentMethodRepository(): IPaymentMethodRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    findAllWithStats: vi.fn(),
    findDefault: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setDefault: vi.fn(),
    getUsageDetail: vi.fn(),
    migrateTransactions: vi.fn(),
  };
}

describe('TransactionEnrichmentService', () => {
  it('should enrich missing fields from the best historical match', async () => {
    const transactionRepository = createMockTransactionRepository();
    const commonNoteRepository = createMockCommonNoteRepository();
    const categoryRepository = createMockCategoryRepository();
    const paymentMethodRepository = createMockPaymentMethodRepository();

    vi.mocked(transactionRepository.findRecent).mockResolvedValue([
      createMockTransaction(),
      createMockTransaction({
        id: 'tx-2',
        amount: 35,
        note: '午饭',
        merchant: '美团',
        subcategory: 'takeout',
        product: '轻食',
      }),
    ]);
    vi.mocked(commonNoteRepository.findByContent).mockResolvedValue(null);
    vi.mocked(categoryRepository.getSubcategories).mockResolvedValue([
      { key: 'coffee', label: '咖啡', category_key: 'food' },
    ]);
    vi.mocked(categoryRepository.getFrequentMerchants).mockResolvedValue([
      { name: '瑞幸咖啡', category_key: 'food', usage_count: 6 },
    ]);
    vi.mocked(paymentMethodRepository.findDefault).mockResolvedValue({
      id: 'pm-default',
      user_id: null,
      name: '微信支付',
      type: 'wechat',
      icon: null,
      color: null,
      last_4_digits: null,
      is_default: true,
      is_active: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const service = new TransactionEnrichmentService({
      transactionRepository,
      commonNoteRepository,
      categoryRepository,
      paymentMethodRepository,
    });

    const result = await service.enrichCreateInput({
      type: 'expense',
      category: 'food',
      amount: 18,
      note: '瑞幸咖啡',
      date: '2024-06-16',
      currency: 'CNY',
    });

    expect(result.payment_method).toBe('pm-wechat');
    expect(result.merchant).toBe('瑞幸咖啡');
    expect(result.subcategory).toBe('coffee');
    expect(result.product).toBe('生椰拿铁');
  });

  it('should expose changed fields for preview rendering', async () => {
    const transactionRepository = createMockTransactionRepository();
    const commonNoteRepository = createMockCommonNoteRepository();
    const categoryRepository = createMockCategoryRepository();
    const paymentMethodRepository = createMockPaymentMethodRepository();

    vi.mocked(transactionRepository.findRecent).mockResolvedValue([createMockTransaction()]);
    vi.mocked(commonNoteRepository.findByContent).mockResolvedValue(null);
    vi.mocked(categoryRepository.getSubcategories).mockResolvedValue([
      { key: 'coffee', label: '咖啡', category_key: 'food' },
    ]);
    vi.mocked(categoryRepository.getFrequentMerchants).mockResolvedValue([
      { name: '瑞幸咖啡', category_key: 'food', usage_count: 6 },
    ]);
    vi.mocked(paymentMethodRepository.findDefault).mockResolvedValue({
      id: 'pm-default',
      user_id: null,
      name: '微信支付',
      type: 'wechat',
      icon: null,
      color: null,
      last_4_digits: null,
      is_default: true,
      is_active: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const service = new TransactionEnrichmentService({
      transactionRepository,
      commonNoteRepository,
      categoryRepository,
      paymentMethodRepository,
    });

    const result = await service.previewCreateInputEnrichment({
      type: 'expense',
      category: 'food',
      amount: 18,
      note: '瑞幸咖啡',
      date: '2024-06-16',
      currency: 'CNY',
    });

    expect(result.changedFields).toEqual([
      'payment_method',
      'merchant',
      'subcategory',
      'product',
    ]);
  });

  it('should fall back to default payment method and note-derived hints when no strong history exists', async () => {
    const transactionRepository = createMockTransactionRepository();
    const commonNoteRepository = createMockCommonNoteRepository();
    const categoryRepository = createMockCategoryRepository();
    const paymentMethodRepository = createMockPaymentMethodRepository();

    vi.mocked(transactionRepository.findRecent).mockResolvedValue([]);
    vi.mocked(commonNoteRepository.findByContent).mockResolvedValue(null);
    vi.mocked(categoryRepository.getSubcategories).mockResolvedValue([
      { key: 'subway', label: '地铁', category_key: 'transport' },
    ]);
    vi.mocked(categoryRepository.getFrequentMerchants).mockResolvedValue([
      { name: '地铁', category_key: 'transport', usage_count: 3 },
    ]);
    vi.mocked(paymentMethodRepository.findDefault).mockResolvedValue({
      id: 'pm-default',
      user_id: null,
      name: '支付宝',
      type: 'alipay',
      icon: null,
      color: null,
      last_4_digits: null,
      is_default: true,
      is_active: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const service = new TransactionEnrichmentService({
      transactionRepository,
      commonNoteRepository,
      categoryRepository,
      paymentMethodRepository,
    });

    const result = await service.enrichCreateInput({
      type: 'expense',
      category: 'transport',
      amount: 6,
      note: '地铁票',
      date: '2024-06-16',
      currency: 'CNY',
    });

    expect(result.payment_method).toBe('pm-default');
    expect(result.merchant).toBe('地铁');
    expect(result.subcategory).toBe('subway');
    expect(result.product).toBe('地铁票');
  });

  it('should keep explicit user input over enriched values', async () => {
    const transactionRepository = createMockTransactionRepository();
    const commonNoteRepository = createMockCommonNoteRepository();
    const categoryRepository = createMockCategoryRepository();
    const paymentMethodRepository = createMockPaymentMethodRepository();

    vi.mocked(transactionRepository.findRecent).mockResolvedValue([createMockTransaction()]);
    vi.mocked(commonNoteRepository.findByContent).mockResolvedValue(null);
    vi.mocked(categoryRepository.getSubcategories).mockResolvedValue([]);
    vi.mocked(categoryRepository.getFrequentMerchants).mockResolvedValue([]);
    vi.mocked(paymentMethodRepository.findDefault).mockResolvedValue(null);

    const service = new TransactionEnrichmentService({
      transactionRepository,
      commonNoteRepository,
      categoryRepository,
      paymentMethodRepository,
    });

    const result = await service.enrichCreateInput({
      type: 'expense',
      category: 'food',
      amount: 18,
      note: '自定义备注',
      date: '2024-06-16',
      currency: 'CNY',
      payment_method: 'pm-custom',
      merchant: '自定义商家',
      subcategory: 'custom-sub',
      product: '自定义产品',
    });

    expect(result.payment_method).toBe('pm-custom');
    expect(result.merchant).toBe('自定义商家');
    expect(result.subcategory).toBe('custom-sub');
    expect(result.product).toBe('自定义产品');
  });
});
