/**
 * 固定支出仓储接口
 * 定义所有固定支出数据访问的标准接口
 */

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  frequency_config: FrequencyConfig;
  start_date: string;
  end_date: string | null;
  skip_holidays: boolean;
  is_active: boolean;
  last_generated: string | null;
  next_generate: string | null;
  created_at: string;
  updated_at: string;
}

export interface FrequencyConfig {
  day_of_month?: number;
  days_of_week?: number[];
}

export interface CreateRecurringExpenseDTO {
  name: string;
  amount: number;
  category: string;
  frequency: RecurringExpense['frequency'];
  frequency_config: FrequencyConfig;
  start_date: string;
  end_date?: string;
  skip_holidays?: boolean;
  is_active?: boolean;
}

export interface UpdateRecurringExpenseDTO {
  name?: string;
  amount?: number;
  category?: string;
  frequency?: RecurringExpense['frequency'];
  frequency_config?: FrequencyConfig;
  start_date?: string;
  end_date?: string | null;
  skip_holidays?: boolean;
  is_active?: boolean;
  last_generated?: string;
  next_generate?: string;
}

/**
 * 固定支出仓储接口
 */
export interface IRecurringExpenseRepository {
  /**
   * 根据 ID 查找固定支出
   */
  findById(id: string): Promise<RecurringExpense | null>;

  /**
   * 获取所有固定支出
   */
  findAll(): Promise<RecurringExpense[]>;

  /**
   * 获取活跃的固定支出
   */
  findActive(): Promise<RecurringExpense[]>;

  /**
   * 获取待生成的固定支出
   */
  findPendingGeneration(today: string, includeOverdue?: boolean): Promise<RecurringExpense[]>;

  /**
   * 创建固定支出
   */
  create(data: CreateRecurringExpenseDTO): Promise<RecurringExpense>;

  /**
   * 更新固定支出
   */
  update(id: string, data: UpdateRecurringExpenseDTO): Promise<RecurringExpense>;

  /**
   * 删除固定支出
   */
  delete(id: string): Promise<void>;

  /**
   * 检查今天是否已生成交易
   */
  hasGeneratedToday(id: string, today: string): Promise<boolean>;

  /**
   * 记录生成日志
   */
  logGeneration(
    recurringExpenseId: string,
    generationDate: string,
    transactionId: string | null,
    status: string,
    reason?: string
  ): Promise<void>;
}
