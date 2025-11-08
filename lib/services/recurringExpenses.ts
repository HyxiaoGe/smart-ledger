import { supabase } from '@/lib/clients/supabase/client';

export interface RecurringExpense {
  id?: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  frequency_config: Record<string, any>;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  last_generated?: string;
  next_generate?: string;
}

export interface FrequencyConfig {
  // 每月配置：每月几号
  day_of_month?: number;

  // 每周配置：星期几 (0=周日, 1=周一, ..., 6=周六)
  days_of_week?: number[];

  // 每日配置：无需额外配置
}

export class RecurringExpenseService {
  /**
   * 创建固定支出
   */
  async createRecurringExpense(data: Omit<RecurringExpense, 'id' | 'last_generated' | 'next_generate'>) {
    // 计算下次生成时间
    const nextGenerate = this.calculateNextGenerateDate(
      data.frequency,
      data.frequency_config,
      data.start_date
    );

    const { data: result, error } = await supabase
      .from('recurring_expenses')
      .insert({
        ...data,
        next_generate: nextGenerate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('创建固定支出失败:', error);
      throw new Error('创建固定支出失败: ' + error.message);
    }

    return result;
  }

  /**
   * 获取所有固定支出
   */
  async getRecurringExpenses() {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取固定支出列表失败:', error);
      throw new Error('获取固定支出列表失败: ' + error.message);
    }

    return data || [];
  }

  /**
   * 更新固定支出
   */
  async updateRecurringExpense(id: string, data: Partial<RecurringExpense>) {
    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString()
    };

    // 如果修改了频率或开始时间，重新计算下次生成时间
    if (data.frequency || data.frequency_config || data.start_date) {
      const current = await this.getRecurringExpenseById(id);
      if (current) {
        updateData.next_generate = this.calculateNextGenerateDate(
          data.frequency || current.frequency,
          data.frequency_config || current.frequency_config,
          data.start_date || current.start_date
        );
      }
    }

    const { data: result, error } = await supabase
      .from('recurring_expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新固定支出失败:', error);
      throw new Error('更新固定支出失败: ' + error.message);
    }

    return result;
  }

  /**
   * 删除固定支出
   */
  async deleteRecurringExpense(id: string) {
    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('删除固定支出失败:', error);
      throw new Error('删除固定支出失败: ' + error.message);
    }
  }

  /**
   * 根据ID获取固定支出
   */
  async getRecurringExpenseById(id: string) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('获取固定支出失败:', error);
      throw new Error('获取固定支出失败: ' + error.message);
    }

    if (!data) {
      throw new Error('固定支出不存在');
    }

    return data;
  }

  /**
   * 计算下次生成时间
   */
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
        // 如果开始时间已过，从明天开始
        if (nextDate < today) {
          nextDate = new Date(today);
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;

      case 'weekly':
        if (config.days_of_week && config.days_of_week.length > 0) {
          // 找到下一个符合条件的日期
          while (true) {
            if (nextDate >= today && config.days_of_week!.includes(nextDate.getDay())) {
              break;
            }
            nextDate.setDate(nextDate.getDate() + 1);
          }
        } else {
          // 默认每周一
          while (nextDate.getDay() !== 1 || nextDate < today) {
            nextDate.setDate(nextDate.getDate() + 1);
          }
        }
        break;

      case 'monthly':
        const targetDay = config.day_of_month || start.getDate();

        // 设置目标日期
        nextDate.setDate(targetDay);

        // 如果日期已过，跳到下个月
        if (nextDate < today) {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        // 处理月份天数不足的情况（如31号在2月不存在）
        const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        if (targetDay > lastDayOfMonth) {
          nextDate.setDate(lastDayOfMonth);
        }
        break;

      default:
        throw new Error(`不支持的频率: ${frequency}`);
    }

    return nextDate.toISOString().split('T')[0];
  }

  /**
   * 手动触发生成固定支出
   */
  async generatePendingExpenses(): Promise<{ generated: number; errors: string[] }> {
    const today = new Date().toISOString().split('T')[0];
    const errors: string[] = [];
    let generated = 0;

    try {
      // 获取待生成的固定支出
      const { data: pendingExpenses, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('is_active', true)
        .lte('next_generate', today);

      if (error) {
        errors.push('获取待生成固定支出失败: ' + error.message);
        return { generated, errors };
      }

      if (!pendingExpenses || pendingExpenses.length === 0) {
        return { generated, errors };
      }

      // 为每个固定支出生成交易记录
      for (const expense of pendingExpenses) {
        try {
          await this.generateTransactionForExpense(expense);
          generated++;
        } catch (error) {
          errors.push(`生成固定支出 "${expense.name}" 失败: ${error}`);
        }
      }

    } catch (error) {
      errors.push('生成过程中发生错误: ' + error);
    }

    return { generated, errors };
  }

  /**
   * 为单个固定支出生成交易记录
   */
  private async generateTransactionForExpense(expense: any) {
    const today = new Date().toISOString().split('T')[0];

    // 检查今天是否已经生成过（避免重复）
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('recurring_expense_id', expense.id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      console.log(`固定支出 "${expense.name}" 今天已生成，跳过`);
      return;
    }

    // 生成交易记录
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        type: 'expense',
        category: expense.category,
        amount: expense.amount,
        note: `[自动生成] ${expense.name}`,
        date: today,
        recurring_expense_id: expense.id,
        is_auto_generated: true
      });

    if (txError) {
      throw new Error('创建交易记录失败: ' + txError.message);
    }

    // 更新固定支出的生成时间和下次生成时间
    const nextGenerate = this.calculateNextDateAfterGeneration(
      expense.frequency,
      expense.frequency_config,
      today
    );

    const { error: updateError } = await supabase
      .from('recurring_expenses')
      .update({
        last_generated: today,
        next_generate: nextGenerate,
        updated_at: new Date().toISOString()
      })
      .eq('id', expense.id);

    if (updateError) {
      throw new Error('更新固定支出状态失败: ' + updateError.message);
    }
  }

  /**
   * 生成后计算下次生成时间
   */
  private calculateNextDateAfterGeneration(
    frequency: string,
    config: FrequencyConfig,
    currentDate: string
  ): string {
    const current = new Date(currentDate);
    let nextDate = new Date(current);

    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;

      case 'weekly':
        if (config.days_of_week && config.days_of_week.length > 0) {
          // 找到下一个符合条件的日期
          let attempts = 0;
          while (attempts < 7) {
            nextDate.setDate(nextDate.getDate() + 1);
            if (config.days_of_week!.includes(nextDate.getDay())) {
              break;
            }
            attempts++;
          }
        } else {
          // 默认下周
          nextDate.setDate(nextDate.getDate() + 7);
        }
        break;

      case 'monthly':
        const targetDay = config.day_of_month || current.getDate();
        nextDate.setMonth(nextDate.getMonth() + 1);

        // 处理月份天数不足的情况
        const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        if (targetDay > lastDayOfMonth) {
          nextDate.setDate(lastDayOfMonth);
        } else {
          nextDate.setDate(targetDay);
        }
        break;
    }

    return nextDate.toISOString().split('T')[0];
  }
}

// 导出单例实例
export const recurringExpenseService = new RecurringExpenseService();