/**
 * AIPredictionServiceServer 测试
 * @module lib/services/aiPrediction.server
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AIPredictionServiceServer } from '@/lib/services/aiPrediction.server';

// Mock Prisma client
vi.mock('@/lib/clients/db', () => ({
  getPrismaClient: vi.fn(() => ({
    transactions: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  })),
}));

// Mock time context generator
vi.mock('@/lib/domain/noteContext', () => ({
  generateTimeContext: vi.fn(() => ({
    hour: 12,
    isWeekend: false,
    label: '中午',
    dayOfWeek: 3,
  })),
}));

describe('AIPredictionServiceServer', () => {
  let service: AIPredictionServiceServer;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    // Create a fresh instance for each test
    service = new (AIPredictionServiceServer as any)();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AIPredictionServiceServer.getInstance();
      const instance2 = AIPredictionServiceServer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('predictTransaction', () => {
    it('should return predictions based on time context', async () => {
      const predictions = await service.predictTransaction();

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);
    });

    it('should include lunch prediction at noon', async () => {
      const predictions = await service.predictTransaction({
        timeContext: { hour: 12, isWeekend: false, label: '中午' } as any,
      });

      const lunchPrediction = predictions.find((p) => p.id === 'lunch-time');
      expect(lunchPrediction).toBeDefined();
      expect(lunchPrediction?.predictedCategory).toBe('food');
    });

    it('should cache predictions', async () => {
      const predictions1 = await service.predictTransaction();
      const predictions2 = await service.predictTransaction();

      expect(predictions1).toEqual(predictions2);
    });

    it('should include recent-based predictions when provided', async () => {
      const recentTransactions = [
        { category: 'food', amount: 25, date: '2024-06-14' },
        { category: 'food', amount: 30, date: '2024-06-13' },
        { category: 'transport', amount: 6, date: '2024-06-12' },
      ];

      const predictions = await service.predictTransaction({
        recentTransactions,
      });

      expect(predictions.length).toBeGreaterThan(0);
    });

    it('should sort predictions by confidence', async () => {
      const predictions = await service.predictTransaction();

      for (let i = 1; i < predictions.length; i++) {
        expect(predictions[i - 1].confidence).toBeGreaterThanOrEqual(
          predictions[i].confidence
        );
      }
    });

    it('should limit predictions to 8', async () => {
      const predictions = await service.predictTransaction();

      expect(predictions.length).toBeLessThanOrEqual(8);
    });
  });

  describe('predictCategory', () => {
    it('should return category predictions based on amount', async () => {
      const predictions = await service.predictCategory(25);

      expect(Array.isArray(predictions)).toBe(true);
      predictions.forEach((p) => {
        expect(p.type).toBe('category');
        expect(p.predictedCategory).toBeDefined();
      });
    });

    it('should match food category for typical meal amounts', async () => {
      const predictions = await service.predictCategory(15);

      const foodPrediction = predictions.find(
        (p) => p.predictedCategory === 'food'
      );
      expect(foodPrediction).toBeDefined();
    });

    it('should match transport category for typical fare amounts', async () => {
      const predictions = await service.predictCategory(6);

      const transportPrediction = predictions.find(
        (p) => p.predictedCategory === 'transport'
      );
      expect(transportPrediction).toBeDefined();
    });

    it('should limit predictions to 5', async () => {
      const predictions = await service.predictCategory(100);

      expect(predictions.length).toBeLessThanOrEqual(5);
    });

    it('should sort predictions by confidence', async () => {
      const predictions = await service.predictCategory(50);

      for (let i = 1; i < predictions.length; i++) {
        expect(predictions[i - 1].confidence).toBeGreaterThanOrEqual(
          predictions[i].confidence
        );
      }
    });
  });

  describe('predictAmount', () => {
    it('should return amount predictions for category', async () => {
      const predictions = await service.predictAmount('food');

      expect(Array.isArray(predictions)).toBe(true);
      predictions.forEach((p) => {
        expect(p.type).toBe('amount');
        expect(p.predictedAmount).toBeDefined();
        expect(p.predictedCategory).toBe('food');
      });
    });

    it('should include price points from patterns', async () => {
      const predictions = await service.predictAmount('drink');

      expect(predictions.length).toBeGreaterThan(0);
      predictions.forEach((p) => {
        expect(typeof p.predictedAmount).toBe('number');
      });
    });

    it('should limit predictions to 5', async () => {
      const predictions = await service.predictAmount('food');

      expect(predictions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('generateQuickSuggestions', () => {
    it('should return quick suggestions', async () => {
      const suggestions = await service.generateQuickSuggestions();

      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach((s) => {
        expect(s.id).toBeDefined();
        expect(s.title).toBeDefined();
        expect(s.category).toBeDefined();
        expect(typeof s.amount).toBe('number');
        expect(typeof s.confidence).toBe('number');
      });
    });

    it('should include lunch suggestion at noon', async () => {
      // Time is set to 12:00
      const suggestions = await service.generateQuickSuggestions();

      const lunchSuggestion = suggestions.find((s) => s.id === 'quick-lunch');
      expect(lunchSuggestion).toBeDefined();
      expect(lunchSuggestion?.category).toBe('food');
    });

    it('should cache suggestions', async () => {
      const suggestions1 = await service.generateQuickSuggestions();
      const suggestions2 = await service.generateQuickSuggestions();

      expect(suggestions1).toEqual(suggestions2);
    });

    it('should sort by confidence', async () => {
      const suggestions = await service.generateQuickSuggestions();

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          suggestions[i].confidence
        );
      }
    });

    it('should limit to 6 suggestions', async () => {
      const suggestions = await service.generateQuickSuggestions();

      expect(suggestions.length).toBeLessThanOrEqual(6);
    });
  });

  describe('time-based predictions', () => {
    it('should predict morning commute on weekday mornings', async () => {
      vi.mocked(
        await import('@/lib/domain/noteContext')
      ).generateTimeContext.mockReturnValue({
        hour: 8,
        isWeekend: false,
        label: '早晨',
        dayOfWeek: 1,
      } as any);

      const freshService = new (AIPredictionServiceServer as any)();
      const predictions = await freshService.predictTransaction({
        timeContext: { hour: 8, isWeekend: false, label: '早晨' },
      });

      const commutePrediction = predictions.find(
        (p: any) => p.id === 'morning-commute'
      );
      expect(commutePrediction).toBeDefined();
      expect(commutePrediction?.predictedCategory).toBe('transport');
    });

    it('should predict dinner in evening', async () => {
      const freshService = new (AIPredictionServiceServer as any)();
      const predictions = await freshService.predictTransaction({
        timeContext: { hour: 19, isWeekend: false, label: '晚上' },
      });

      const dinnerPrediction = predictions.find(
        (p: any) => p.id === 'dinner-time'
      );
      expect(dinnerPrediction).toBeDefined();
      expect(dinnerPrediction?.predictedCategory).toBe('food');
    });

    it('should predict coffee during coffee hours', async () => {
      const freshService = new (AIPredictionServiceServer as any)();
      const predictions = await freshService.predictTransaction({
        timeContext: { hour: 15, isWeekend: false, label: '下午' },
      });

      const coffeePrediction = predictions.find(
        (p: any) => p.id === 'coffee-time'
      );
      expect(coffeePrediction).toBeDefined();
      expect(coffeePrediction?.predictedCategory).toBe('drink');
    });
  });

  describe('cache management', () => {
    it('should clean up expired cache', async () => {
      // Generate some cached data
      await service.predictTransaction();

      // Fast-forward past cache TTL
      vi.advanceTimersByTime(6 * 60 * 1000);

      service.cleanupCache();

      // New prediction should not hit cache
      const predictions = await service.predictTransaction();
      expect(predictions.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeRecentTransactions', () => {
    it('should identify frequent category', async () => {
      const recentTransactions = [
        { category: 'food', amount: 25 },
        { category: 'food', amount: 30 },
        { category: 'food', amount: 20 },
        { category: 'transport', amount: 6 },
      ];

      const predictions = await service.predictTransaction({
        recentTransactions,
      });

      const recentPattern = predictions.find((p) => p.id === 'recent-pattern');
      expect(recentPattern).toBeDefined();
      expect(recentPattern?.predictedCategory).toBe('food');
    });
  });

  describe('calculateMedian helper', () => {
    it('should calculate median for odd-length array', () => {
      // Access private method through reflection
      const calculateMedian = (service as any).calculateMedian.bind(service);

      expect(calculateMedian([1, 2, 3])).toBe(2);
      expect(calculateMedian([1, 5, 3])).toBe(3);
    });

    it('should calculate median for even-length array', () => {
      const calculateMedian = (service as any).calculateMedian.bind(service);

      expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
      expect(calculateMedian([1, 2])).toBe(1.5);
    });
  });
});
