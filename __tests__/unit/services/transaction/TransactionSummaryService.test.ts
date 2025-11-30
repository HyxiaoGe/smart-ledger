/**
 * TransactionSummaryService 测试
 * @module lib/services/transaction/TransactionSummaryService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TransactionSummaryService } from '@/lib/services/transaction/TransactionSummaryService';
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

describe('TransactionSummaryService', () => {
  let service: TransactionSummaryService;
  let mockRepository: ITransactionRepository;
  let cache: MemoryCache;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'));

    mockRepository = createMockRepository();
    cache = new MemoryCache();
    service = new TransactionSummaryService(mockRepository, cache);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getCurrentMonthSummary', () => {
    it('should return current month summary', async () => {
      const mockTransactions = [
        createMockTransaction({ id: '1', date: '2024-06-01', amount: 100 }),
        createMockTransaction({ id: '2', date: '2024-06-01', amount: 50 }),
        createMockTransaction({ id: '3', date: '2024-06-15', amount: 200 }),
      ];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.getCurrentMonthSummary();

      expect(result.monthTotalAmount).toBe(350);
      expect(result.monthTotalCount).toBe(3);
      expect(result.monthItems.length).toBe(2); // Two unique dates
    });

    it('should aggregate transactions by date', async () => {
      const mockTransactions = [
        createMockTransaction({ id: '1', date: '2024-06-15', amount: 100 }),
        createMockTransaction({ id: '2', date: '2024-06-15', amount: 50 }),
      ];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.getCurrentMonthSummary();

      expect(result.monthItems.length).toBe(1);
      expect(result.monthItems[0].date).toBe('2024-06-15');
      expect(result.monthItems[0].total).toBe(150);
      expect(result.monthItems[0].count).toBe(2);
    });

    it('should return empty summary when no transactions', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

      const result = await service.getCurrentMonthSummary();

      expect(result.monthTotalAmount).toBe(0);
      expect(result.monthTotalCount).toBe(0);
      expect(result.monthItems).toEqual([]);
    });

    it('should cache results', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

      await service.getCurrentMonthSummary();
      await service.getCurrentMonthSummary();

      expect(mockRepository.findByDateRange).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMonthSummary', () => {
    it('should return summary for specific month', async () => {
      const mockTransactions = [
        createMockTransaction({ id: '1', date: '2024-05-10', amount: 100 }),
        createMockTransaction({ id: '2', date: '2024-05-20', amount: 200 }),
      ];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.getMonthSummary(2024, 5);

      expect(result.monthTotalAmount).toBe(300);
      expect(result.monthTotalCount).toBe(2);
    });

    it('should query correct date range', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

      await service.getMonthSummary(2024, 6);

      expect(mockRepository.findByDateRange).toHaveBeenCalledWith(
        '2024-06-01',
        '2024-07-01',
        'expense'
      );
    });

    it('should handle January correctly', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

      await service.getMonthSummary(2024, 1);

      expect(mockRepository.findByDateRange).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-02-01',
        'expense'
      );
    });

    it('should handle December correctly', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

      await service.getMonthSummary(2024, 12);

      expect(mockRepository.findByDateRange).toHaveBeenCalledWith(
        '2024-12-01',
        '2025-01-01',
        'expense'
      );
    });

    it('should cache results by month', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

      await service.getMonthSummary(2024, 6);
      await service.getMonthSummary(2024, 6);
      await service.getMonthSummary(2024, 5);

      expect(mockRepository.findByDateRange).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCategorySummary', () => {
    it('should return category statistics', async () => {
      const mockStats = [
        { category: 'food', totalAmount: 500, count: 10, percentage: 50 },
        { category: 'transport', totalAmount: 300, count: 5, percentage: 30 },
        { category: 'entertainment', totalAmount: 200, count: 3, percentage: 20 },
      ];
      vi.mocked(mockRepository.getStatsByCategory).mockResolvedValue(mockStats);

      const result = await service.getCategorySummary(2024, 6);

      expect(result.length).toBe(3);
      expect(result[0].category).toBe('food');
      expect(result[0].total).toBe(500);
      expect(result[0].count).toBe(10);
      expect(result[0].percentage).toBe(50);
    });

    it('should call repository with correct filter', async () => {
      vi.mocked(mockRepository.getStatsByCategory).mockResolvedValue([]);

      await service.getCategorySummary(2024, 6);

      expect(mockRepository.getStatsByCategory).toHaveBeenCalledWith({
        type: 'expense',
        startDate: '2024-06-01',
        endDate: '2024-07-01',
      });
    });

    it('should cache category summary', async () => {
      vi.mocked(mockRepository.getStatsByCategory).mockResolvedValue([]);

      await service.getCategorySummary(2024, 6);
      await service.getCategorySummary(2024, 6);

      expect(mockRepository.getStatsByCategory).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDateRangeSummary', () => {
    it('should return summary for date range', async () => {
      const mockTransactions = [
        createMockTransaction({ id: '1', date: '2024-06-01', amount: 100 }),
        createMockTransaction({ id: '2', date: '2024-06-10', amount: 200 }),
      ];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.getDateRangeSummary('2024-06-01', '2024-06-15');

      expect(result.monthTotalAmount).toBe(300);
      expect(result.monthTotalCount).toBe(2);
    });

    it('should call repository with provided dates', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

      await service.getDateRangeSummary('2024-06-01', '2024-06-30');

      expect(mockRepository.findByDateRange).toHaveBeenCalledWith(
        '2024-06-01',
        '2024-06-30',
        'expense'
      );
    });
  });

  describe('getStats', () => {
    it('should return transaction statistics', async () => {
      const mockStats = {
        totalAmount: 1000,
        count: 20,
        avgAmount: 50,
        maxAmount: 200,
        minAmount: 10,
      };
      vi.mocked(mockRepository.getStats).mockResolvedValue(mockStats);

      const result = await service.getStats('2024-06-01', '2024-06-30');

      expect(result).toEqual(mockStats);
    });

    it('should call repository with correct filter', async () => {
      vi.mocked(mockRepository.getStats).mockResolvedValue({
        totalAmount: 0,
        count: 0,
        avgAmount: 0,
        maxAmount: 0,
        minAmount: 0,
      });

      await service.getStats('2024-06-01', '2024-06-30');

      expect(mockRepository.getStats).toHaveBeenCalledWith({
        type: 'expense',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      });
    });

    it('should cache stats', async () => {
      vi.mocked(mockRepository.getStats).mockResolvedValue({
        totalAmount: 0,
        count: 0,
        avgAmount: 0,
        maxAmount: 0,
        minAmount: 0,
      });

      await service.getStats('2024-06-01', '2024-06-30');
      await service.getStats('2024-06-01', '2024-06-30');

      expect(mockRepository.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCache', () => {
    it('should invalidate summary and stats cache', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);
      vi.mocked(mockRepository.getStats).mockResolvedValue({
        totalAmount: 0,
        count: 0,
        avgAmount: 0,
        maxAmount: 0,
        minAmount: 0,
      });

      await service.getCurrentMonthSummary();
      await service.getStats('2024-06-01', '2024-06-30');

      service.clearCache();

      await service.getCurrentMonthSummary();
      await service.getStats('2024-06-01', '2024-06-30');

      expect(mockRepository.findByDateRange).toHaveBeenCalledTimes(2);
      expect(mockRepository.getStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('aggregation edge cases', () => {
    it('should handle transactions with zero amount', async () => {
      const mockTransactions = [
        createMockTransaction({ id: '1', date: '2024-06-15', amount: 0 }),
        createMockTransaction({ id: '2', date: '2024-06-15', amount: 100 }),
      ];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.getCurrentMonthSummary();

      expect(result.monthTotalAmount).toBe(100);
      expect(result.monthTotalCount).toBe(2);
    });

    it('should handle transactions with decimal amounts', async () => {
      const mockTransactions = [
        createMockTransaction({ id: '1', date: '2024-06-15', amount: 10.5 }),
        createMockTransaction({ id: '2', date: '2024-06-15', amount: 20.3 }),
      ];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.getCurrentMonthSummary();

      expect(result.monthTotalAmount).toBeCloseTo(30.8, 2);
    });

    it('should handle undefined amount gracefully', async () => {
      const mockTransactions = [
        createMockTransaction({ id: '1', date: '2024-06-15', amount: undefined as any }),
        createMockTransaction({ id: '2', date: '2024-06-15', amount: 100 }),
      ];
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(mockTransactions);

      const result = await service.getCurrentMonthSummary();

      expect(result.monthTotalAmount).toBe(100);
    });
  });
});
