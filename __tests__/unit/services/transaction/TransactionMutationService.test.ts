/**
 * TransactionMutationService 测试
 * @module lib/services/transaction/TransactionMutationService
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionMutationService } from '@/lib/services/transaction/TransactionMutationService';
import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type { ICommonNoteRepository } from '@/lib/domain/repositories/ICommonNoteRepository';
import { InternalError, NotFoundError } from '@/lib/domain/errors/AppError';
import type { Transaction } from '@/types/domain/transaction';
import type { TransactionEnrichmentService } from '@/lib/services/transaction/TransactionEnrichmentService';

function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'test-id-1',
    type: 'expense',
    amount: 88,
    category: 'food',
    date: '2024-06-15',
    note: '午饭',
    currency: 'CNY',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

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

function createMockEnrichmentService(): TransactionEnrichmentService {
  return {
    enrichCreateInput: vi.fn(),
  } as unknown as TransactionEnrichmentService;
}

describe('TransactionMutationService', () => {
  let service: TransactionMutationService;
  let mockRepository: ITransactionRepository;
  let mockCommonNoteRepository: ICommonNoteRepository;
  let mockEnrichmentService: TransactionEnrichmentService;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockCommonNoteRepository = createMockCommonNoteRepository();
    mockEnrichmentService = createMockEnrichmentService();
    service = new TransactionMutationService(
      mockRepository,
      mockCommonNoteRepository,
      mockEnrichmentService
    );
  });

  describe('createTransaction', () => {
    it('should create transaction and sync common note when note exists', async () => {
      const transaction = createMockTransaction();
      vi.mocked(mockEnrichmentService.enrichCreateInput).mockResolvedValue({
        type: 'expense',
        category: 'food',
        amount: 88,
        note: '午饭',
        date: '2024-06-15',
        currency: 'CNY',
        payment_method: 'pm-wechat',
      });
      vi.mocked(mockRepository.create).mockResolvedValue(transaction);
      vi.mocked(mockCommonNoteRepository.upsert).mockResolvedValue({
        id: 'note-1',
        content: '午饭',
        usage_count: 1,
        last_used: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_active: true,
      });

      const result = await service.createTransaction({
        type: 'expense',
        category: 'food',
        amount: 88,
        note: '午饭',
        date: '2024-06-15',
        currency: 'CNY',
      });

      expect(result).toEqual(transaction);
      expect(mockEnrichmentService.enrichCreateInput).toHaveBeenCalledWith({
        type: 'expense',
        category: 'food',
        amount: 88,
        note: '午饭',
        date: '2024-06-15',
        currency: 'CNY',
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        type: 'expense',
        category: 'food',
        amount: 88,
        note: '午饭',
        date: '2024-06-15',
        currency: 'CNY',
        payment_method: 'pm-wechat',
      });
      expect(mockCommonNoteRepository.upsert).toHaveBeenCalledWith('午饭', 88, 'food');
    });

    it('should skip common note sync when note is blank', async () => {
      const transaction = createMockTransaction({ note: '   ' });
      vi.mocked(mockEnrichmentService.enrichCreateInput).mockResolvedValue({
        type: 'expense',
        category: 'food',
        amount: 88,
        note: '   ',
        date: '2024-06-15',
        currency: 'CNY',
      });
      vi.mocked(mockRepository.create).mockResolvedValue(transaction);

      await service.createTransaction({
        type: 'expense',
        category: 'food',
        amount: 88,
        note: '   ',
        date: '2024-06-15',
        currency: 'CNY',
      });

      expect(mockCommonNoteRepository.upsert).not.toHaveBeenCalled();
    });

    it('should ignore common note sync failure', async () => {
      const transaction = createMockTransaction();
      vi.mocked(mockEnrichmentService.enrichCreateInput).mockResolvedValue({
        type: 'expense',
        category: 'food',
        amount: 88,
        note: '午饭',
        date: '2024-06-15',
        currency: 'CNY',
      });
      vi.mocked(mockRepository.create).mockResolvedValue(transaction);
      vi.mocked(mockCommonNoteRepository.upsert).mockRejectedValue(new Error('sync failed'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.createTransaction({
        type: 'expense',
        category: 'food',
        amount: 88,
        note: '午饭',
        date: '2024-06-15',
        currency: 'CNY',
      });

      expect(result).toEqual(transaction);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should fall back to original input when enrichment fails', async () => {
      const transaction = createMockTransaction();
      vi.mocked(mockEnrichmentService.enrichCreateInput).mockRejectedValue(new Error('boom'));
      vi.mocked(mockRepository.create).mockResolvedValue(transaction);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await service.createTransaction({
        type: 'expense',
        category: 'food',
        amount: 88,
        note: '午饭',
        date: '2024-06-15',
        currency: 'CNY',
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        type: 'expense',
        category: 'food',
        amount: 88,
        note: '午饭',
        date: '2024-06-15',
        currency: 'CNY',
      });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction after existence check', async () => {
      const transaction = createMockTransaction({ amount: 128 });
      vi.mocked(mockRepository.exists).mockResolvedValue(true);
      vi.mocked(mockRepository.update).mockResolvedValue(transaction);

      const result = await service.updateTransaction('test-id-1', {
        amount: 128,
        note: '晚饭',
      });

      expect(mockRepository.exists).toHaveBeenCalledWith('test-id-1', undefined);
      expect(mockRepository.update).toHaveBeenCalledWith('test-id-1', {
        amount: 128,
        note: '晚饭',
      });
      expect(result).toEqual(transaction);
    });

    it('should throw NotFoundError when updating missing transaction', async () => {
      vi.mocked(mockRepository.exists).mockResolvedValue(false);

      await expect(service.updateTransaction('missing-id', { amount: 100 })).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTransaction', () => {
    it('should soft delete existing transaction', async () => {
      vi.mocked(mockRepository.exists).mockResolvedValue(true);
      vi.mocked(mockRepository.softDelete).mockResolvedValue();

      await service.deleteTransaction('test-id-1');

      expect(mockRepository.exists).toHaveBeenCalledWith('test-id-1', undefined);
      expect(mockRepository.softDelete).toHaveBeenCalledWith('test-id-1');
    });

    it('should throw NotFoundError when deleting missing transaction', async () => {
      vi.mocked(mockRepository.exists).mockResolvedValue(false);

      await expect(service.deleteTransaction('missing-id')).rejects.toBeInstanceOf(NotFoundError);
      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('restoreTransaction', () => {
    it('should restore transaction with includeDeleted existence check', async () => {
      const restoredTransaction = createMockTransaction({ id: 'deleted-id' });
      vi.mocked(mockRepository.exists).mockResolvedValue(true);
      vi.mocked(mockRepository.restore).mockResolvedValue();
      vi.mocked(mockRepository.findById).mockResolvedValue(restoredTransaction);

      const result = await service.restoreTransaction('deleted-id');

      expect(mockRepository.exists).toHaveBeenCalledWith('deleted-id', {
        includeDeleted: true,
      });
      expect(mockRepository.restore).toHaveBeenCalledWith('deleted-id');
      expect(mockRepository.findById).toHaveBeenCalledWith('deleted-id');
      expect(result).toEqual(restoredTransaction);
    });

    it('should throw NotFoundError when restoring missing transaction', async () => {
      vi.mocked(mockRepository.exists).mockResolvedValue(false);

      await expect(service.restoreTransaction('missing-id')).rejects.toBeInstanceOf(NotFoundError);
      expect(mockRepository.restore).not.toHaveBeenCalled();
    });

    it('should throw InternalError when restored transaction cannot be loaded', async () => {
      vi.mocked(mockRepository.exists).mockResolvedValue(true);
      vi.mocked(mockRepository.restore).mockResolvedValue();
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.restoreTransaction('deleted-id')).rejects.toBeInstanceOf(InternalError);
      expect(mockRepository.findById).toHaveBeenCalledWith('deleted-id');
    });
  });
});
