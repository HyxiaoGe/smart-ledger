import type { ICommonNoteRepository } from '@/lib/domain/repositories/ICommonNoteRepository';
import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import { NotFoundError } from '@/lib/domain/errors/AppError';
import type { Transaction } from '@/types/domain/transaction';
import type { CreateTransactionDTO, UpdateTransactionDTO } from '@/types/dto/transaction.dto';

export class TransactionMutationService {
  constructor(
    private readonly repository: ITransactionRepository,
    private readonly commonNoteRepository: ICommonNoteRepository
  ) {}

  async createTransaction(input: CreateTransactionDTO): Promise<Transaction> {
    const transaction = await this.repository.create(input);
    await this.syncCommonNote({
      note: input.note,
      amount: input.amount,
      category: input.category,
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

  async restoreTransaction(id: string): Promise<void> {
    await this.ensureExists(id, { includeDeleted: true });
    await this.repository.restore(id);
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
}
