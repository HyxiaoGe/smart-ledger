/**
 * 月报告仓储接口
 * 月报告包含所有支出（固定支出 + 可变支出），展示完整的月度财务状况
 */

export interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface MerchantStat {
  merchant: string;
  amount: number;
  count: number;
}

export interface PaymentMethodStat {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface FixedExpenseItem {
  name: string;
  category: string;
  amount: number;
  recurring_expense_id: string | null;
}

export interface MonthlyReport {
  id: string;
  user_id: string | null;
  year: number;
  month: number;
  // 总支出（包含固定支出）
  total_expenses: number;
  // 固定支出金额
  fixed_expenses: number;
  // 可变支出金额（日常消费）
  variable_expenses: number;
  transaction_count: number;
  fixed_transaction_count: number;
  variable_transaction_count: number;
  average_transaction: number | null;
  average_daily_expense: number | null;
  // 分类统计
  category_breakdown: CategoryStat[];
  // 固定支出明细
  fixed_expenses_breakdown: FixedExpenseItem[];
  top_merchants: MerchantStat[];
  payment_method_stats: PaymentMethodStat[];
  // 环比变化
  month_over_month_change: number | null;
  month_over_month_percentage: number | null;
  ai_insights: string | null;
  generated_at: string;
  generation_type: 'auto' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface CreateMonthlyReportDTO {
  year: number;
  month: number;
  total_expenses: number;
  fixed_expenses: number;
  variable_expenses: number;
  transaction_count: number;
  fixed_transaction_count: number;
  variable_transaction_count: number;
  average_transaction?: number;
  average_daily_expense?: number;
  category_breakdown?: CategoryStat[];
  fixed_expenses_breakdown?: FixedExpenseItem[];
  top_merchants?: MerchantStat[];
  payment_method_stats?: PaymentMethodStat[];
  month_over_month_change?: number;
  month_over_month_percentage?: number;
  ai_insights?: string;
  generation_type?: 'auto' | 'manual';
}

export interface MonthlyReportGenerationResult {
  success: boolean;
  message: string;
  report?: MonthlyReport;
}

/**
 * 月报告仓储接口
 */
export interface IMonthlyReportRepository {
  /**
   * 根据 ID 查找月报告
   */
  findById(id: string): Promise<MonthlyReport | null>;

  /**
   * 根据年月查找月报告
   */
  findByYearMonth(year: number, month: number): Promise<MonthlyReport | null>;

  /**
   * 获取所有月报告
   */
  findAll(): Promise<MonthlyReport[]>;

  /**
   * 获取最新的月报告
   */
  findLatest(): Promise<MonthlyReport | null>;

  /**
   * 根据年份查找月报告
   */
  findByYear(year: number): Promise<MonthlyReport[]>;

  /**
   * 检查某月的报告是否已存在
   */
  existsForMonth(year: number, month: number): Promise<boolean>;

  /**
   * 创建月报告
   */
  create(data: CreateMonthlyReportDTO): Promise<MonthlyReport>;

  /**
   * 更新月报告
   */
  update(id: string, data: Partial<CreateMonthlyReportDTO>): Promise<MonthlyReport>;

  /**
   * 删除月报告
   */
  delete(id: string): Promise<void>;

  /**
   * 生成月报告（基于交易数据计算）
   */
  generate(year: number, month: number): Promise<MonthlyReportGenerationResult>;
}
