/**
 * Supabase 固定支出仓储实现
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IRecurringExpenseRepository,
  RecurringExpense,
  CreateRecurringExpenseDTO,
  UpdateRecurringExpenseDTO,
  FrequencyConfig,
} from '@/lib/domain/repositories/IRecurringExpenseRepository';

export class SupabaseRecurringExpenseRepository implements IRecurringExpenseRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<RecurringExpense | null> {
    const { data, error } = await this.supabase
      .from('recurring_expenses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findAll(): Promise<RecurringExpense[]> {
    const { data, error } = await this.supabase
      .from('recurring_expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async findActive(): Promise<RecurringExpense[]> {
    const { data, error } = await this.supabase
      .from('recurring_expenses')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async findPendingGeneration(today: string): Promise<RecurringExpense[]> {
    const { data, error } = await this.supabase
      .from('recurring_expenses')
      .select('*')
      .eq('is_active', true)
      .lte('next_generate', today);

    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async create(dto: CreateRecurringExpenseDTO): Promise<RecurringExpense> {
    const nextGenerate = this.calculateNextGenerateDate(
      dto.frequency,
      dto.frequency_config,
      dto.start_date
    );

    const { data, error } = await this.supabase
      .from('recurring_expenses')
      .insert({
        name: dto.name,
        amount: dto.amount,
        category: dto.category,
        frequency: dto.frequency,
        frequency_config: dto.frequency_config,
        start_date: dto.start_date,
        end_date: dto.end_date || null,
        is_active: dto.is_active ?? true,
        next_generate: nextGenerate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建固定支出失败: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async update(id: string, dto: UpdateRecurringExpenseDTO): Promise<RecurringExpense> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
    if (dto.frequency_config !== undefined) updateData.frequency_config = dto.frequency_config;
    if (dto.start_date !== undefined) updateData.start_date = dto.start_date;
    if (dto.end_date !== undefined) updateData.end_date = dto.end_date;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
    if (dto.last_generated !== undefined) updateData.last_generated = dto.last_generated;
    if (dto.next_generate !== undefined) updateData.next_generate = dto.next_generate;

    // 如果修改了频率相关参数，重新计算下次生成时间
    if (dto.frequency || dto.frequency_config || dto.start_date) {
      const current = await this.findById(id);
      if (current) {
        updateData.next_generate = this.calculateNextGenerateDate(
          dto.frequency || current.frequency,
          dto.frequency_config || current.frequency_config,
          dto.start_date || current.start_date
        );
      }
    }

    const { data, error } = await this.supabase
      .from('recurring_expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`更新固定支出失败: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`删除固定支出失败: ${error.message}`);
    }
  }

  async hasGeneratedToday(id: string, today: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('id')
      .eq('recurring_expense_id', id)
      .eq('date', today)
      .maybeSingle();

    return !error && data !== null;
  }

  async logGeneration(
    recurringExpenseId: string,
    generationDate: string,
    transactionId: string | null,
    status: string,
    reason?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('recurring_generation_logs')
      .insert({
        recurring_expense_id: recurringExpenseId,
        generation_date: generationDate,
        generated_transaction_id: transactionId,
        status,
        reason,
      });

    if (error) {
      console.error('记录生成日志失败:', error);
    }
  }

  private calculateNextGenerateDate(
    frequency: string,
    config: FrequencyConfig,
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
      frequency: row.frequency,
      frequency_config: row.frequency_config || {},
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active ?? true,
      last_generated: row.last_generated,
      next_generate: row.next_generate,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
