/**
 * TransactionAnalyticsService 测试
 * @module lib/services/transaction/TransactionAnalyticsService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TransactionAnalyticsService } from '@/lib/services/transaction/TransactionAnalyticsService';
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
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('TransactionAnalyticsService', () => {
  let service: TransactionAnalyticsService;
  let mockRepository: ITransactionRepository;
  let cache: MemoryCache;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'));

    mockRepository = createMockRepository();
    cache = new MemoryCache();
    service = new TransactionAnalyticsService(mockRepository, cache);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getAIAnalysisData', () => {
    it('should return AI analysis data for current month', async () => {
      const currentMonthTransactions = [
        createMockTransaction({ id: '1', date: '2024-06-01', amount: 100 }),
        createMockTransaction({ id: '2', date: '2024-06-15', amount: 200 }),
      ];
      const lastMonthTransactions = [
        createMockTransaction({ id: '3', date: '2024-05-10', amount: 150 }),
      ];

      vi.mocked(mockRepository.findMany)
        .mockResolvedValueOnce({ data: currentMonthTransactions, total: 2, page: 1, pageSize: 100, totalPages: 1 })
        .mockResolvedValueOnce({ data: lastMonthTransactions, total: 1, page: 1, pageSize: 100, totalPages: 1 })
        .mockResolvedValueOnce({ data: currentMonthTransactions.slice(0, 2), total: 2, page: 1, pageSize: 20, totalPages: 1 });

      const result = await service.getAIAnalysisData();

      expect(result.currentMonthStr).toBe('2024-06');
      expect(result.lastMonthStr).toBe('2024-05');
      expect(result.currentMonthFull).toEqual(currentMonthTransactions);
      expect(result.lastMonth).toEqual(lastMonthTransactions);
    });

    it('should use target month when provided', async () => {
      vi.mocked(mockRepository.findMany).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 100,
        totalPages: 0,
      });

      const result = await service.getAIAnalysisData('2024-03');

      expect(result.currentMonthStr).toBe('2024-03');
      expect(result.lastMonthStr).toBe('2024-02');
    });

    it('should handle January correctly (year boundary)', async () => {
      vi.mocked(mockRepository.findMany).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 100,
        totalPages: 0,
      });

      const result = await service.getAIAnalysisData('2024-01');

      expect(result.currentMonthStr).toBe('2024-01');
      expect(result.lastMonthStr).toBe('2023-12');
    });

    it('should cache results', async () => {
      vi.mocked(mockRepository.findMany).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 100,
        totalPages: 0,
      });

      await service.getAIAnalysisData();
      await service.getAIAnalysisData();

      // findMany is called 3 times per request (current, last, top20)
      expect(mockRepository.findMany).toHaveBeenCalledTimes(3);
    });
  });

  describe('getPredictionData', () => {
    it('should return prediction data for multiple months', async () => {
      const transactions = [
        createMockTransaction({ id: '1', date: '2024-06-15', amount: 100, category: 'food' }),
        createMockTransaction({ id: '2', date: '2024-06-10', amount: 200, category: 'transport' }),
      ];

      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(transactions);

      const result = await service.getPredictionData(3);

      expect(result.monthlyData.length).toBe(3);
      expect(result.overallStats.totalMonths).toBe(3);
    });

    it('should calculate category analysis correctly', async () => {
      const transactions = [
        createMockTransaction({ id: '1', date: '2024-06-15', amount: 100, category: 'food' }),
        createMockTransaction({ id: '2', date: '2024-06-10', amount: 50, category: 'food' }),
        createMockTransaction({ id: '3', date: '2024-06-05', amount: 200, category: 'transport' }),
      ];

      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(transactions);

      const result = await service.getPredictionData(1);

      const foodCategory = result.categoryAnalysis.find((c) => c.category === 'food');
      const transportCategory = result.categoryAnalysis.find((c) => c.category === 'transport');

      expect(foodCategory?.totalTransactions).toBe(2);
      expect(transportCategory?.totalTransactions).toBe(1);
    });

    it('should calculate overall stats correctly', async () => {
      const transactions = [
        createMockTransaction({ id: '1', date: '2024-06-15', amount: 100 }),
        createMockTransaction({ id: '2', date: '2024-06-10', amount: 200 }),
      ];

      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(transactions);

      const result = await service.getPredictionData(2);

      expect(result.overallStats.totalTransactions).toBeGreaterThan(0);
      expect(result.overallStats.avgMonthlySpending).toBeGreaterThan(0);
    });

    it('should assess data quality correctly', async () => {
      const transactions = Array.from({ length: 60 }, (_, i) =>
        createMockTransaction({
          id: `${i}`,
          date: `2024-06-${(i % 28 + 1).toString().padStart(2, '0')}`,
          amount: 10 + i,
        })
      );

      vi.mocked(mockRepository.findByDateRange).mockResolvedValue(transactions);

      const result = await service.getPredictionData(4);

      expect(result.overallStats.dataQuality.sufficientData).toBe(true);
      expect(result.overallStats.dataQuality.dataRichness).toBe(true);
    });

    it('should handle empty data gracefully', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

      const result = await service.getPredictionData(3);

      expect(result.monthlyData.every((m) => m.totalAmount === 0)).toBe(true);
      expect(result.overallStats.avgMonthlySpending).toBe(0);
    });

    it('should cache prediction data with longer TTL', async () => {
      vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

      await service.getPredictionData(3);
      await service.getPredictionData(3);

      // Called once per month (3 months)
      expect(mockRepository.findByDateRange).toHaveBeenCalledTimes(3);
    });
  });

  describe('advanced analysis', () => {
    describe('spending patterns', () => {
      it('should calculate spending frequency and average', async () => {
        const transactions = [
          createMockTransaction({ id: '1', date: '2024-06-01', amount: 100 }),
          createMockTransaction({ id: '2', date: '2024-06-01', amount: 50 }),
          createMockTransaction({ id: '3', date: '2024-06-15', amount: 200 }),
        ];

        vi.mocked(mockRepository.findByDateRange).mockResolvedValue(transactions);

        const result = await service.getPredictionData(1);

        expect(result.advancedAnalysis.spendingPatterns).toBeDefined();
        expect(result.advancedAnalysis.spendingPatterns.avgAmount).toBeGreaterThan(0);
      });
    });

    describe('seasonal patterns', () => {
      it('should detect low seasonality for consistent spending', async () => {
        // Create consistent spending across months
        vi.mocked(mockRepository.findByDateRange).mockImplementation(async (start) => {
          return [
            createMockTransaction({ date: start, amount: 100 }),
            createMockTransaction({ date: start, amount: 100 }),
          ];
        });

        const result = await service.getPredictionData(6);

        expect(result.advancedAnalysis.seasonalPatterns).toBeDefined();
      });

      it('should handle insufficient data for seasonality', async () => {
        vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

        const result = await service.getPredictionData(2);

        expect(result.advancedAnalysis.seasonalPatterns.seasonality).toBe('low');
      });
    });

    describe('time distribution', () => {
      it('should analyze day of week distribution', async () => {
        // Monday: 2024-06-03, Tuesday: 2024-06-04, Saturday: 2024-06-08
        const transactions = [
          createMockTransaction({ id: '1', date: '2024-06-03', amount: 100 }),
          createMockTransaction({ id: '2', date: '2024-06-04', amount: 100 }),
          createMockTransaction({ id: '3', date: '2024-06-08', amount: 100 }),
        ];

        vi.mocked(mockRepository.findByDateRange).mockResolvedValue(transactions);

        const result = await service.getPredictionData(1);

        expect(result.advancedAnalysis.timeDistribution).toBeDefined();
        expect(result.advancedAnalysis.timeDistribution.dayOfWeekDistribution).toBeDefined();
      });

      it('should detect weekday preference', async () => {
        // Create more weekday transactions
        const transactions = [
          createMockTransaction({ id: '1', date: '2024-06-03', amount: 100 }), // Mon
          createMockTransaction({ id: '2', date: '2024-06-04', amount: 100 }), // Tue
          createMockTransaction({ id: '3', date: '2024-06-05', amount: 100 }), // Wed
          createMockTransaction({ id: '4', date: '2024-06-06', amount: 100 }), // Thu
          createMockTransaction({ id: '5', date: '2024-06-07', amount: 100 }), // Fri
        ];

        vi.mocked(mockRepository.findByDateRange).mockResolvedValue(transactions);

        const result = await service.getPredictionData(1);

        expect(result.advancedAnalysis.timeDistribution.timePreference).toBe('weekday');
      });

      it('should handle empty transactions', async () => {
        vi.mocked(mockRepository.findByDateRange).mockResolvedValue([]);

        const result = await service.getPredictionData(1);

        expect(result.advancedAnalysis.timeDistribution.timePreference).toBe('none');
      });
    });
  });

  describe('clearCache', () => {
    it('should invalidate analytics cache', async () => {
      vi.mocked(mockRepository.findMany).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 100,
        totalPages: 0,
      });

      await service.getAIAnalysisData();
      service.clearCache();
      await service.getAIAnalysisData();

      // 6 calls total (3 per request, 2 requests)
      expect(mockRepository.findMany).toHaveBeenCalledTimes(6);
    });
  });
});
