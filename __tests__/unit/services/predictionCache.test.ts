/**
 * predictionCache 服务测试
 * @module lib/services/predictionCache
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We need to mock localStorage before importing the module
function createMockLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

describe('predictionCache', () => {
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;
  let predictionCacheModule: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'));

    mockLocalStorage = createMockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Dynamically import to ensure fresh module state
    vi.resetModules();
    predictionCacheModule = await import('@/lib/services/predictionCache');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('PredictionCacheService', () => {
    describe('getCachedPrediction', () => {
      it('should return null when no cache exists', () => {
        const params = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };

        const result = predictionCacheModule.predictionCache.getCachedPrediction(params);
        expect(result).toBeNull();
      });

      it('should return cached data when valid', () => {
        const params = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };

        const mockData = { predictions: [{ month: '2024-07', amount: 1000 }] };

        // Set cache
        predictionCacheModule.predictionCache.setCachedPrediction(mockData, params);

        // Get cache
        const result = predictionCacheModule.predictionCache.getCachedPrediction(params);
        expect(result).toEqual(mockData);
      });

      it('should return null when params do not match', () => {
        const params1 = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };
        const params2 = {
          monthsToAnalyze: 3, // Different
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };

        const mockData = { predictions: [] };
        predictionCacheModule.predictionCache.setCachedPrediction(mockData, params1);

        const result = predictionCacheModule.predictionCache.getCachedPrediction(params2);
        expect(result).toBeNull();
      });

      it('should return null when cache is expired', () => {
        const params = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };

        const mockData = { predictions: [] };
        predictionCacheModule.predictionCache.setCachedPrediction(mockData, params);

        // Fast-forward time beyond TTL (default is 30 minutes)
        vi.advanceTimersByTime(31 * 60 * 1000);

        const result = predictionCacheModule.predictionCache.getCachedPrediction(params);
        expect(result).toBeNull();
      });

      it('should return null when transaction count differs', () => {
        const params1 = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };
        const params2 = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 150, // Different
        };

        const mockData = { predictions: [] };
        predictionCacheModule.predictionCache.setCachedPrediction(mockData, params1);

        const result = predictionCacheModule.predictionCache.getCachedPrediction(params2);
        expect(result).toBeNull();
      });

      it('should handle localStorage errors gracefully', () => {
        mockLocalStorage.getItem = vi.fn().mockImplementation(() => {
          throw new Error('Storage error');
        });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = predictionCacheModule.predictionCache.getCachedPrediction({
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        });

        expect(result).toBeNull();
        consoleSpy.mockRestore();
      });
    });

    describe('setCachedPrediction', () => {
      it('should store prediction data in localStorage', () => {
        const params = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };
        const mockData = { predictions: [] };

        predictionCacheModule.predictionCache.setCachedPrediction(mockData, params);

        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });

      it('should include version and timestamp', () => {
        const params = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };
        const mockData = { predictions: [] };

        predictionCacheModule.predictionCache.setCachedPrediction(mockData, params);

        const setItemCall = mockLocalStorage.setItem.mock.calls[0];
        const storedData = JSON.parse(setItemCall[1]);

        expect(storedData.version).toBeDefined();
        expect(storedData.timestamp).toBeDefined();
        expect(storedData.params).toEqual(params);
      });

      it('should handle localStorage errors gracefully', () => {
        mockLocalStorage.setItem = vi.fn().mockImplementation(() => {
          throw new Error('Quota exceeded');
        });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Should not throw
        predictionCacheModule.predictionCache.setCachedPrediction(
          { predictions: [] },
          {
            monthsToAnalyze: 6,
            predictionMonths: 3,
            confidenceThreshold: 70,
            transactionCount: 100,
          }
        );

        consoleSpy.mockRestore();
      });
    });

    describe('clearCache', () => {
      it('should remove cached prediction', () => {
        const params = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };

        predictionCacheModule.predictionCache.setCachedPrediction({ predictions: [] }, params);
        predictionCacheModule.predictionCache.clearCache();

        expect(mockLocalStorage.removeItem).toHaveBeenCalled();
      });
    });

    describe('saveUserFeedback', () => {
      it('should save feedback to localStorage', () => {
        const feedback = {
          accuracyRating: 4,
          helpfulRating: 5,
          comment: 'Great predictions!',
          predictionParams: {
            monthsToAnalyze: 6,
            predictionMonths: 3,
            confidenceThreshold: 70,
          },
        };

        predictionCacheModule.predictionCache.saveUserFeedback(feedback);

        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });

      it('should generate unique feedback ID', () => {
        const feedback = {
          accuracyRating: 4,
          helpfulRating: 5,
          comment: 'Test',
          predictionParams: {
            monthsToAnalyze: 6,
            predictionMonths: 3,
            confidenceThreshold: 70,
          },
        };

        predictionCacheModule.predictionCache.saveUserFeedback(feedback);

        const setItemCall = mockLocalStorage.setItem.mock.calls[0];
        const storedFeedbacks = JSON.parse(setItemCall[1]);

        expect(storedFeedbacks[0].id).toMatch(/^feedback_/);
        expect(storedFeedbacks[0].timestamp).toBeDefined();
      });
    });

    describe('getAllFeedbacks', () => {
      it('should return empty array when no feedbacks', () => {
        const result = predictionCacheModule.predictionCache.getAllFeedbacks();
        expect(result).toEqual([]);
      });

      it('should return stored feedbacks', () => {
        const feedback = {
          accuracyRating: 4,
          helpfulRating: 5,
          comment: 'Test',
          predictionParams: {
            monthsToAnalyze: 6,
            predictionMonths: 3,
            confidenceThreshold: 70,
          },
        };

        predictionCacheModule.predictionCache.saveUserFeedback(feedback);

        const result = predictionCacheModule.predictionCache.getAllFeedbacks();
        expect(result.length).toBe(1);
        expect(result[0].accuracyRating).toBe(4);
      });
    });

    describe('getFeedbackStats', () => {
      it('should return zero stats when no feedbacks', () => {
        const stats = predictionCacheModule.predictionCache.getFeedbackStats();

        expect(stats.totalFeedbacks).toBe(0);
        expect(stats.avgAccuracyRating).toBe(0);
        expect(stats.avgHelpfulRating).toBe(0);
      });

      it('should calculate average ratings correctly', () => {
        const feedbacks = [
          {
            accuracyRating: 4,
            helpfulRating: 5,
            comment: 'Test 1',
            predictionParams: { monthsToAnalyze: 6, predictionMonths: 3, confidenceThreshold: 70 },
          },
          {
            accuracyRating: 2,
            helpfulRating: 3,
            comment: 'Test 2',
            predictionParams: { monthsToAnalyze: 6, predictionMonths: 3, confidenceThreshold: 70 },
          },
        ];

        feedbacks.forEach((f) => predictionCacheModule.predictionCache.saveUserFeedback(f));

        const stats = predictionCacheModule.predictionCache.getFeedbackStats();

        expect(stats.totalFeedbacks).toBe(2);
        expect(stats.avgAccuracyRating).toBe(3); // (4 + 2) / 2
        expect(stats.avgHelpfulRating).toBe(4); // (5 + 3) / 2
      });
    });

    describe('isCacheValid', () => {
      it('should return false when no cache', () => {
        const result = predictionCacheModule.predictionCache.isCacheValid();
        expect(result).toBe(false);
      });

      it('should return true when cache is valid', () => {
        const params = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };

        predictionCacheModule.predictionCache.setCachedPrediction({ predictions: [] }, params);

        const result = predictionCacheModule.predictionCache.isCacheValid();
        expect(result).toBe(true);
      });

      it('should return false when cache is expired', () => {
        const params = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };

        predictionCacheModule.predictionCache.setCachedPrediction({ predictions: [] }, params);

        // Fast-forward time beyond TTL
        vi.advanceTimersByTime(31 * 60 * 1000);

        const result = predictionCacheModule.predictionCache.isCacheValid();
        expect(result).toBe(false);
      });
    });

    describe('invalidateCache', () => {
      it('should clear the cache', () => {
        const params = {
          monthsToAnalyze: 6,
          predictionMonths: 3,
          confidenceThreshold: 70,
          transactionCount: 100,
        };

        predictionCacheModule.predictionCache.setCachedPrediction({ predictions: [] }, params);
        predictionCacheModule.predictionCache.invalidateCache();

        const result = predictionCacheModule.predictionCache.isCacheValid();
        expect(result).toBe(false);
      });
    });
  });

  describe('shouldRefreshCache utility', () => {
    it('should return true when no cache exists', () => {
      const result = predictionCacheModule.shouldRefreshCache('2024-06-15', 100);
      expect(result).toBe(true);
    });

    it('should return false when valid cache exists with matching params', () => {
      const params = {
        monthsToAnalyze: 6,
        predictionMonths: 3,
        confidenceThreshold: 70,
        lastTransactionDate: '2024-06-15',
        transactionCount: 100,
      };

      predictionCacheModule.predictionCache.setCachedPrediction({ predictions: [] }, params);

      const result = predictionCacheModule.shouldRefreshCache('2024-06-15', 100);
      expect(result).toBe(false);
    });

    it('should return true when transaction count changed', () => {
      const params = {
        monthsToAnalyze: 6,
        predictionMonths: 3,
        confidenceThreshold: 70,
        lastTransactionDate: '2024-06-15',
        transactionCount: 100,
      };

      predictionCacheModule.predictionCache.setCachedPrediction({ predictions: [] }, params);

      // Different transaction count
      const result = predictionCacheModule.shouldRefreshCache('2024-06-15', 150);
      expect(result).toBe(true);
    });
  });
});
