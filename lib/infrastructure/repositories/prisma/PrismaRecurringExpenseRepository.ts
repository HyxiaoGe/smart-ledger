/**
 * Prisma 固定支出仓储实现
 */

import type { PrismaClient } from '@prisma/client';
import type {
  IRecurringExpenseRepository,
  RecurringExpense,
  CreateRecurringExpenseDTO,
  UpdateRecurringExpenseDTO,
} from '@/lib/domain/repositories/IRecurringExpenseRepository';

export class PrismaRecurringExpenseRepository implements IRecurringExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<RecurringExpense | null> {
    const data = await this.prisma.recurring_expenses.findUnique({
      where: { id },
    });
    return data ? this.mapToEntity(data) : null;
  }

  async findAll(): Promise<RecurringExpense[]> {
    const data = await this.prisma.recurring_expenses.findMany({
      orderBy: { created_at: 'desc' },
    });
    return data.map(this.mapToEntity);
  }

  async findActive(): Promise<RecurringExpense[]> {
    const data = await this.prisma.recurring_expenses.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
    return data.map(this.mapToEntity);
  }

  async findPendingGeneration(today: string): Promise<RecurringExpense[]> {
    const data = await this.prisma.recurring_expenses.findMany({
      where: {
        is_active: true,
        next_generate: { lte: new Date(today) },
      },
    });
    return data.map(this.mapToEntity);
  }

  async create(data: CreateRecurringExpenseDTO): Promise<RecurringExpense> {
    const nextGenerate = this.calculateNextGenerateDate(
      data.frequency,
      data.frequency_config,
      data.start_date
    );

    const result = await this.prisma.recurring_expenses.create({
      data: {
        name: data.name,
        amount: data.amount,
        category: data.category,
        frequency: data.frequency,
        frequency_config: data.frequency_config as any,
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : null,
        is_active: data.is_active ?? true,
        next_generate: new Date(nextGenerate),
      },
    });

    return this.mapToEntity(result);
  }

  async update(id: string, data: UpdateRecurringExpenseDTO): Promise<RecurringExpense> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.frequency_config !== undefined) updateData.frequency_config = data.frequency_config;
    if (data.start_date !== undefined) updateData.start_date = new Date(data.start_date);
    if (data.end_date !== undefined) updateData.end_date = data.end_date ? new Date(data.end_date) : null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.last_generated !== undefined) updateData.last_generated = new Date(data.last_generated);
    if (data.next_generate !== undefined) updateData.next_generate = new Date(data.next_generate);

    // 如果修改了频率相关参数，重新计算下次生成时间
    if (data.frequency || data.frequency_config || data.start_date) {
      const current = await this.findById(id);
      if (current) {
        const nextGenerate = this.calculateNextGenerateDate(
          data.frequency || current.frequency,
          data.frequency_config || current.frequency_config,
          data.start_date || current.start_date
        );
        updateData.next_generate = new Date(nextGenerate);
      }
    }

    const result = await this.prisma.recurring_expenses.update({
      where: { id },
      data: updateData,
    });

    return this.mapToEntity(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recurring_expenses.delete({
      where: { id },
    });
  }

  async hasGeneratedToday(id: string, today: string): Promise<boolean> {
    const count = await this.prisma.transactions.count({
      where: {
        recurring_expense_id: id,
        date: new Date(today),
      },
    });
    return count > 0;
  }

  async logGeneration(
    recurringExpenseId: string,
    generationDate: string,
    transactionId: string | null,
    status: string,
    reason?: string
  ): Promise<void> {
    await this.prisma.recurring_generation_logs.create({
      data: {
        recurring_expense_id: recurringExpenseId,
        generation_date: new Date(generationDate),
        generated_transaction_id: transactionId,
        status,
        reason,
      },
    });
  }

  private calculateNextGenerateDate(
    frequency: string,
    config: any,
    startDate: string
  ): string {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextDate = new Date(start);

    switch (frequency) {
      case 'daily':
        if (nextDate < today) {
          nextDate = new Date(today);
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;

      case 'weekly':
        if (config.days_of_week && config.days_of_week.length > 0) {
          while (true) {
            if (nextDate >= today && config.days_of_week.includes(nextDate.getDay())) {
              break;
            }
            nextDate.setDate(nextDate.getDate() + 1);
          }
        } else {
          while (nextDate.getDay() !== 1 || nextDate < today) {
            nextDate.setDate(nextDate.getDate() + 1);
          }
        }
        break;

      case 'monthly':
        const targetDay = config.day_of_month || start.getDate();
        nextDate.setDate(targetDay);

        if (nextDate < today) {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        if (targetDay > lastDayOfMonth) {
          nextDate.setDate(lastDayOfMonth);
        }
        break;
    }

    return nextDate.toISOString().split('T')[0];
  }

  private mapToEntity(row: any): RecurringExpense {
    return {
      id: row.id,
      name: row.name,
      amount: Number(row.amount),
      category: row.category,
      frequency: row.frequency as RecurringExpense['frequency'],
      frequency_config: row.frequency_config as any || {},
      start_date: row.start_date instanceof Date
        ? row.start_date.toISOString().split('T')[0]
        : row.start_date,
      end_date: row.end_date instanceof Date
        ? row.end_date.toISOString().split('T')[0]
        : row.end_date,
      is_active: row.is_active ?? true,
      last_generated: row.last_generated instanceof Date
        ? row.last_generated.toISOString().split('T')[0]
        : row.last_generated,
      next_generate: row.next_generate instanceof Date
        ? row.next_generate.toISOString().split('T')[0]
        : row.next_generate,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    };
  }
}
