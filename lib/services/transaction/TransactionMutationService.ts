import type { ICommonNoteRepository } from '@/lib/domain/repositories/ICommonNoteRepository';
import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import { InternalError, NotFoundError } from '@/lib/domain/errors/AppError';
import type { Transaction } from '@/types/domain/transaction';
import type { CreateTransactionDTO, UpdateTransactionDTO } from '@/types/dto/transaction.dto';
import type { TransactionEnrichmentService } from './TransactionEnrichmentService';

export class TransactionMutationService {
  constructor(
    private readonly repository: ITransactionRepository,
    private readonly commonNoteRepository: ICommonNoteRepository,
    private readonly enrichmentService?: TransactionEnrichmentService
  ) {}

  async createTransaction(input: CreateTransactionDTO): Promise<Transaction> {
    const transactionInput = await this.enrichInputSafely(input);
    const transaction = await this.repository.create(transactionInput);
    await this.syncCommonNote({
      note: transactionInput.note,
      amount: transactionInput.amount,
      category: transactionInput.category,
    });
    return transaction;
  }

  async updateTransaction(id: string, input: UpdateTransactionDTO): Promise<Transaction> {
    await this.ensureExists(id);
    return this.repository.update(id, input);
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.repository.softDelete(id);
  }

  async restoreTransaction(id: string): Promise<Transaction> {
    await this.ensureExists(id, { includeDeleted: true });
    await this.repository.restore(id);

    const restoredTransaction = await this.repository.findById(id);
    if (!restoredTransaction) {
      throw new InternalError(`交易恢复后读取失败: ${id}`);
    }

    return restoredTransaction;
  }

  private async ensureExists(
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<void> {
    const exists = await this.repository.exists(id, options);
    if (!exists) {
      throw new NotFoundError(`交易不存在: ${id}`);
    }
  }

  private async syncCommonNote(params: {
    note?: string;
    amount?: number;
    category?: string;
  }): Promise<void> {
    const note = params.note?.trim();
    if (!note) return;

    try {
      await this.commonNoteRepository.upsert(note, params.amount, params.category);
    } catch (error) {
      console.error('更新常用备注失败:', error);
    }
  }

  private async enrichInputSafely(input: CreateTransactionDTO): Promise<CreateTransactionDTO> {
    if (!this.enrichmentService) {
      return input;
    }

    try {
      return await this.enrichmentService.enrichCreateInput(input);
    } catch (error) {
      console.error('交易 enrich 失败，回退原始输入:', error);
      return input;
    }
  }
}
