/**
 * 周报告仓储接口
 * 定义所有周报告数据访问的标准接口
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

export interface WeeklyReport {
  id: string;
  user_id: string | null;
  week_start_date: string;
  week_end_date: string;
  total_expenses: number;
  transaction_count: number;
  average_transaction: number | null;
  category_breakdown: CategoryStat[];
  top_merchants: MerchantStat[];
  payment_method_stats: PaymentMethodStat[];
  week_over_week_change: number | null;
  week_over_week_percentage: number | null;
  ai_insights: string | null;
  generated_at: string;
  generation_type: 'auto' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface CreateWeeklyReportDTO {
  week_start_date: string;
  week_end_date: string;
  total_expenses: number;
  transaction_count: number;
  average_transaction?: number;
  category_breakdown?: CategoryStat[];
  top_merchants?: MerchantStat[];
  payment_method_stats?: PaymentMethodStat[];
  week_over_week_change?: number;
  week_over_week_percentage?: number;
  ai_insights?: string;
  generation_type?: 'auto' | 'manual';
}

export interface WeeklyReportGenerationResult {
  success: boolean;
  message: string;
  report?: WeeklyReport;
}

/**
 * 周报告仓储接口
 */
export interface IWeeklyReportRepository {
  /**
   * 根据 ID 查找周报告
   */
  findById(id: string): Promise<WeeklyReport | null>;

  /**
   * 获取所有周报告
   */
  findAll(): Promise<WeeklyReport[]>;

  /**
   * 获取最新的周报告
   */
  findLatest(): Promise<WeeklyReport | null>;

  /**
   * 根据日期范围查找周报告
   */
  findByDateRange(startDate: string, endDate: string): Promise<WeeklyReport[]>;

  /**
   * 检查某周的报告是否已存在
   */
  existsForWeek(weekStartDate: string): Promise<boolean>;

  /**
   * 创建周报告
   */
  create(data: CreateWeeklyReportDTO): Promise<WeeklyReport>;

  /**
   * 删除周报告
   */
  delete(id: string): Promise<void>;

  /**
   * 生成周报告（基于交易数据计算）
   */
  generate(weekStartDate?: string): Promise<WeeklyReportGenerationResult>;
}
