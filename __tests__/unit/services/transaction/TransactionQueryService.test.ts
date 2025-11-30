/**
 * TransactionQueryService 测试
 * @module lib/services/transaction/TransactionQueryService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TransactionQueryService } from '@/lib/services/transaction/TransactionQueryService';
import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import { MemoryCache } from '@/lib/infrastructure/cache/MemoryCache';
import type { Transaction } from '@/types/domain/transaction';

// Mock repository factory
function createMockRepository(): ITransactionRepository {
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

// Mock transaction factory
function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'test-id-1',
    type: 'expense',
    amount: 100,
    category: 'food',
    date: '2024-06-15',
    note: 'Test transaction',
    currency: 'CNY',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('TransactionQueryService', () => {
  let service: TransactionQueryService;
  let mockRepository: ITransactionRepository;
  let cache: MemoryCache;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'));

    mockRepository = createMockRepository();
    cache = new MemoryCache();
    service = new TransactionQueryService(mockRepository, cache);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return transaction by ID', async () => {
      const mockTransaction = createMockTransaction();
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTransaction);

      const result = await service.findById('test-id-1');

      expect(result).toEqual(mockTransaction);
      expect(mockRepository.findById).toHaveBeenCalledWith('test-id-1');
    });

    it('should return null when transaction not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should cache results', async () => {
      const mockTransaction = createMockTransaction();
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTransaction);

      await service.findById('test-id-1');
      await service.findById('test-id-1');

      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByMonth', () => {
    it('should return transactions for specific month', async () => {
      const mockTransactions = [
        createMockTransaction({ id: '1', date: '2024-06-01' }),
        createMockTransaction({ id: '2', date: '2024-06-15' }),
      ];
      vi.mocked(mockRepository.findByMonth).mockResolvedValue(mockTransactions);

      const result = await service.findByMonth(2024, 6, 'expense');

      expect(result).toEqual(mockTransactions);
      expect(mockRepository.findByMonth).toHaveBeenCalledWith(2024, 6, 'expense');
    });

    it('should cache month query results', async () => {
      vi.mocked(mockRepository.findByMonth).mockResolvedValue([]);

      await service.findByMonth(2024, 6);
      await service.findByMonth(2024, 6);

      expect(mockRepository.findByMonth).toHaveBeenCalledTimes(1);
    });

    it('should separate cache by type', async () => {
      vi.mocked(mockRepository.findByMonth).mockResolvedValue([]);

      await service.findByMonth(2024, 6, 'expense');
      await service.findByMonth(2024, 6, 'income');

      expect(mockRepository.findByMonth).toHaveBeenCalledTimes(2);
    });
  });

  describe('listRecent', () => {
    it('should return recent transactions with default limit', async () => {
      const mockTransactions = [
        createMockTransaction({ id: '1' }),
        createMockTransaction({ id: '2' }),
      ];
      vi.mocked(mockRepository.findRecent).mockResolvedValue(mockTransactions);

      const result = await service.listRecent();

      expect(result).toEqual(mockTransactions);
      expect(mockRepository.findRecent).toHaveBeenCalledWith(10, undefined);
    });

    it('should respect custom limit', async () => {
      vi.mocked(mockRepository.findRecent).mockResolvedValue([]);

      await service.listRecent(5, 'expense');

      expect(mockRepository.findRecent).toHaveBeenCalledWith(5, 'expense');
    });

    it('should cache recent queries', async () => {
      vi.mocked(mockRepository.findRecent).mockResolvedValue([]);

      await service.listRecent(10);
      await service.listRecent(10);

      expect(mockRepository.findRecent).toHaveBeenCalledTimes(1);
    });
  });

  describe('listByRange', () => {
    it('should return transactions for today range', async () => {
      const mockTransactions = [createMockTransaction({ date: '2024-06-15' })];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.listByRange(undefined, 'today');

      expect(result.rows).toEqual(mockTransactions);
      expect(result.monthLabel).toBe('今天');
    });

    it('should return transactions for yesterday range', async () => {
      const mockTransactions = [createMockTransaction({ date: '2024-06-14' })];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.listByRange(undefined, 'yesterday');

      expect(result.rows).toEqual(mockTransactions);
      expect(result.monthLabel).toBe('昨天');
    });

    it('should return transactions for month range', async () => {
      const mockTransactions = [
        createMockTransaction({ date: '2024-06-01' }),
        createMockTransaction({ date: '2024-06-30' }),
      ];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.listByRange('2024-06', 'month');

      expect(result.rows).toEqual(mockTransactions);
    });

    it('should return transactions for custom date range', async () => {
      const mockTransactions = [createMockTransaction({ date: '2024-06-10' })];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.listByRange(undefined, 'custom', '2024-06-01', '2024-06-15');

      expect(result.rows).toEqual(mockTransactions);
      // 自定义范围格式为 'MM-DD ~ MM-DD'
      expect(result.monthLabel).toBe('06-01 ~ 06-15');
    });

    it('should default to current month when no arguments', async () => {
      const mockTransactions = [createMockTransaction()];
      // When no range specified, listByRange defaults to current month
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      // When both month and range are undefined, it defaults to current month (2024-06)
      const result = await service.listByRange(undefined, undefined);

      expect(result.rows).toEqual(mockTransactions);
      // The label should be the current month format
      expect(result.monthLabel).toBe('2024-06');
    });

    it('should cache range queries', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

      await service.listByRange(undefined, 'today');
      await service.listByRange(undefined, 'today');

      expect(mockRepository.findByDateRange).toHaveBeenCalledTimes(1);
    });
  });

  describe('listYesterdayTransactions', () => {
    it('should return yesterday transactions when range is today', async () => {
      const mockTransactions = [createMockTransaction({ date: '2024-06-14' })];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.listYesterdayTransactions('today');

      expect(result).toEqual(mockTransactions);
    });

    it('should return yesterday transactions when range is yesterday', async () => {
      const mockTransactions = [createMockTransaction({ date: '2024-06-14' })];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.listYesterdayTransactions('yesterday');

      expect(result).toEqual(mockTransactions);
    });

    it('should return empty array for other ranges', async () => {
      const result = await service.listYesterdayTransactions('month');

      expect(result).toEqual([]);
      expect(mockRepository.findByDateRange).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should invalidate transaction cache', async () => {
      const mockTransaction = createMockTransaction();
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTransaction);

      await service.findById('test-id-1');
      service.clearCache();
      await service.findById('test-id-1');

      expect(mockRepository.findById).toHaveBeenCalledTimes(2);
    });
  });
});
