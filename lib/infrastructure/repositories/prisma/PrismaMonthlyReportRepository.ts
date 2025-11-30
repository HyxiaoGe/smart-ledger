/**
 * Prisma 月报告仓储实现
 * 月报告包含所有支出，区分固定支出和可变支出
 */

import type { PrismaClient } from '@prisma/client';
import type {
  IMonthlyReportRepository,
  MonthlyReport,
  CreateMonthlyReportDTO,
  MonthlyReportGenerationResult,
  CategoryStat,
  MerchantStat,
  PaymentMethodStat,
  FixedExpenseItem,
} from '@/lib/domain/repositories/IMonthlyReportRepository';

export class PrismaMonthlyReportRepository implements IMonthlyReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<MonthlyReport | null> {
    const data = await this.prisma.monthly_reports.findUnique({
      where: { id: BigInt(id) },
    });
    return data ? this.mapToEntity(data) : null;
  }

  async findByYearMonth(year: number, month: number): Promise<MonthlyReport | null> {
    const data = await this.prisma.monthly_reports.findUnique({
      where: { year_month: { year, month } },
    });
    return data ? this.mapToEntity(data) : null;
  }

  async findAll(): Promise<MonthlyReport[]> {
    const data = await this.prisma.monthly_reports.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return data.map(this.mapToEntity);
  }

  async findLatest(): Promise<MonthlyReport | null> {
    const data = await this.prisma.monthly_reports.findFirst({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return data ? this.mapToEntity(data) : null;
  }

  async findByYear(year: number): Promise<MonthlyReport[]> {
    const data = await this.prisma.monthly_reports.findMany({
      where: { year },
      orderBy: { month: 'desc' },
    });
    return data.map(this.mapToEntity);
  }

  async existsForMonth(year: number, month: number): Promise<boolean> {
    const count = await this.prisma.monthly_reports.count({
      where: { year, month },
    });
    return count > 0;
  }

  async create(data: CreateMonthlyReportDTO): Promise<MonthlyReport> {
    const result = await this.prisma.monthly_reports.create({
      data: {
        year: data.year,
        month: data.month,
        total_expenses: data.total_expenses,
        fixed_expenses: data.fixed_expenses,
        variable_expenses: data.variable_expenses,
        transaction_count: data.transaction_count,
        fixed_transaction_count: data.fixed_transaction_count,
        variable_transaction_count: data.variable_transaction_count,
        average_transaction: data.average_transaction,
        average_daily_expense: data.average_daily_expense,
        category_breakdown: data.category_breakdown as any || [],
        fixed_expenses_breakdown: data.fixed_expenses_breakdown as any || [],
        top_merchants: data.top_merchants as any || [],
        payment_method_stats: data.payment_method_stats as any || [],
        month_over_month_change: data.month_over_month_change,
        month_over_month_percentage: data.month_over_month_percentage,
        ai_insights: data.ai_insights,
        generation_type: data.generation_type || 'manual',
        generated_at: new Date(),
      },
    });

    return this.mapToEntity(result);
  }

  async update(id: string, data: Partial<CreateMonthlyReportDTO>): Promise<MonthlyReport> {
    const result = await this.prisma.monthly_reports.update({
      where: { id: BigInt(id) },
      data: {
        ...(data.total_expenses !== undefined && { total_expenses: data.total_expenses }),
        ...(data.fixed_expenses !== undefined && { fixed_expenses: data.fixed_expenses }),
        ...(data.variable_expenses !== undefined && { variable_expenses: data.variable_expenses }),
        ...(data.transaction_count !== undefined && { transaction_count: data.transaction_count }),
        ...(data.fixed_transaction_count !== undefined && { fixed_transaction_count: data.fixed_transaction_count }),
        ...(data.variable_transaction_count !== undefined && { variable_transaction_count: data.variable_transaction_count }),
        ...(data.average_transaction !== undefined && { average_transaction: data.average_transaction }),
        ...(data.average_daily_expense !== undefined && { average_daily_expense: data.average_daily_expense }),
        ...(data.category_breakdown && { category_breakdown: data.category_breakdown as any }),
        ...(data.fixed_expenses_breakdown && { fixed_expenses_breakdown: data.fixed_expenses_breakdown as any }),
        ...(data.top_merchants && { top_merchants: data.top_merchants as any }),
        ...(data.payment_method_stats && { payment_method_stats: data.payment_method_stats as any }),
        ...(data.month_over_month_change !== undefined && { month_over_month_change: data.month_over_month_change }),
        ...(data.month_over_month_percentage !== undefined && { month_over_month_percentage: data.month_over_month_percentage }),
        ...(data.ai_insights !== undefined && { ai_insights: data.ai_insights }),
        updated_at: new Date(),
      },
    });

    return this.mapToEntity(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.monthly_reports.delete({
      where: { id: BigInt(id) },
    });
  }

  async generate(year: number, month: number): Promise<MonthlyReportGenerationResult> {
    // 计算本月日期范围
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // 月末
    const daysInMonth = endDate.getDate();

    // 检查是否已存在
    const exists = await this.existsForMonth(year, month);

    // 查询本月所有交易（包含固定支出和可变支出）
    const allTransactions = await this.prisma.transactions.findMany({
      where: {
        deleted_at: null,
        type: 'expense',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (allTransactions.length === 0) {
      return {
        success: false,
        message: `${year}年${month}月没有支出记录，无法生成报告`,
      };
    }

    // 分离固定支出和可变支出
    type TransactionRow = {
      category: string;
      merchant: string | null;
      payment_method: string | null;
      amount: unknown;
      note: string | null;
      recurring_expense_id: string | null;
      is_auto_generated: boolean | null;
    };

    const fixedTransactions: TransactionRow[] = [];
    const variableTransactions: TransactionRow[] = [];

    allTransactions.forEach((t: TransactionRow) => {
      if (t.recurring_expense_id || t.is_auto_generated) {
        fixedTransactions.push(t);
      } else {
        variableTransactions.push(t);
      }
    });

    // 计算各项统计
    const totalExpenses = allTransactions.reduce((sum: number, t: TransactionRow) => sum + Number(t.amount), 0);
    const fixedExpenses = fixedTransactions.reduce((sum: number, t: TransactionRow) => sum + Number(t.amount), 0);
    const variableExpenses = variableTransactions.reduce((sum: number, t: TransactionRow) => sum + Number(t.amount), 0);

    const transactionCount = allTransactions.length;
    const fixedTransactionCount = fixedTransactions.length;
    const variableTransactionCount = variableTransactions.length;

    const avgTransaction = transactionCount > 0 ? totalExpenses / transactionCount : 0;
    const avgDailyExpense = totalExpenses / daysInMonth;

    // 分类统计（所有支出）
    const categoryMap = new Map<string, { amount: number; count: number }>();
    allTransactions.forEach((t: TransactionRow) => {
      const existing = categoryMap.get(t.category) || { amount: 0, count: 0 };
      categoryMap.set(t.category, {
        amount: existing.amount + Number(t.amount),
        count: existing.count + 1,
      });
    });

    const categoryBreakdown: CategoryStat[] = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        amount: stats.amount,
        count: stats.count,
        percentage: totalExpenses > 0 ? (stats.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 固定支出明细
    const fixedExpensesBreakdown: FixedExpenseItem[] = fixedTransactions.map((t: TransactionRow) => ({
      name: t.note || t.category,
      category: t.category,
      amount: Number(t.amount),
      recurring_expense_id: t.recurring_expense_id,
    }));

    // 商家统计
    const merchantMap = new Map<string, { amount: number; count: number }>();
    allTransactions.forEach((t: TransactionRow) => {
      if (t.merchant) {
        const existing = merchantMap.get(t.merchant) || { amount: 0, count: 0 };
        merchantMap.set(t.merchant, {
          amount: existing.amount + Number(t.amount),
          count: existing.count + 1,
        });
      }
    });

    const topMerchants: MerchantStat[] = Array.from(merchantMap.entries())
      .map(([merchant, stats]) => ({
        merchant,
        amount: stats.amount,
        count: stats.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // 支付方式统计
    const paymentMap = new Map<string, { amount: number; count: number }>();
    allTransactions.forEach((t: TransactionRow) => {
      const method = t.payment_method || '未指定';
      const existing = paymentMap.get(method) || { amount: 0, count: 0 };
      paymentMap.set(method, {
        amount: existing.amount + Number(t.amount),
        count: existing.count + 1,
      });
    });

    const paymentMethodStats: PaymentMethodStat[] = Array.from(paymentMap.entries())
      .map(([method, stats]) => ({
        method,
        amount: stats.amount,
        count: stats.count,
        percentage: totalExpenses > 0 ? (stats.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 计算环比变化（上月数据）
    const lastMonthStart = new Date(year, month - 2, 1);
    const lastMonthEnd = new Date(year, month - 1, 0);

    const lastMonthTransactions = await this.prisma.transactions.findMany({
      where: {
        deleted_at: null,
        type: 'expense',
        date: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    });

    const lastMonthTotal = lastMonthTransactions.reduce((sum: number, t: { amount: unknown }) => sum + Number(t.amount), 0);
    const monthOverMonthChange = totalExpenses - lastMonthTotal;
    const monthOverMonthPercentage = lastMonthTotal > 0
      ? ((totalExpenses - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

    // 创建或更新报告
    const reportData: CreateMonthlyReportDTO = {
      year,
      month,
      total_expenses: totalExpenses,
      fixed_expenses: fixedExpenses,
      variable_expenses: variableExpenses,
      transaction_count: transactionCount,
      fixed_transaction_count: fixedTransactionCount,
      variable_transaction_count: variableTransactionCount,
      average_transaction: avgTransaction,
      average_daily_expense: avgDailyExpense,
      category_breakdown: categoryBreakdown,
      fixed_expenses_breakdown: fixedExpensesBreakdown,
      top_merchants: topMerchants,
      payment_method_stats: paymentMethodStats,
      month_over_month_change: monthOverMonthChange,
      month_over_month_percentage: monthOverMonthPercentage,
      generation_type: 'manual',
    };

    let report: MonthlyReport;

    if (exists) {
      // 更新现有报告
      const existingReport = await this.findByYearMonth(year, month);
      if (existingReport) {
        report = await this.update(existingReport.id, reportData);
        return {
          success: true,
          message: `${year}年${month}月报告已更新`,
          report,
        };
      }
    }

    // 创建新报告
    report = await this.create(reportData);

    return {
      success: true,
      message: `${year}年${month}月报告生成成功`,
      report,
    };
  }

  private mapToEntity(row: any): MonthlyReport {
    return {
      id: row.id.toString(),
      user_id: row.user_id,
      year: row.year,
      month: row.month,
      total_expenses: Number(row.total_expenses),
      fixed_expenses: Number(row.fixed_expenses),
      variable_expenses: Number(row.variable_expenses),
      transaction_count: row.transaction_count,
      fixed_transaction_count: row.fixed_transaction_count,
      variable_transaction_count: row.variable_transaction_count,
      average_transaction: row.average_transaction ? Number(row.average_transaction) : null,
      average_daily_expense: row.average_daily_expense ? Number(row.average_daily_expense) : null,
      category_breakdown: (row.category_breakdown as CategoryStat[]) || [],
      fixed_expenses_breakdown: (row.fixed_expenses_breakdown as FixedExpenseItem[]) || [],
      top_merchants: (row.top_merchants as MerchantStat[]) || [],
      payment_method_stats: (row.payment_method_stats as PaymentMethodStat[]) || [],
      month_over_month_change: row.month_over_month_change ? Number(row.month_over_month_change) : null,
      month_over_month_percentage: row.month_over_month_percentage ? Number(row.month_over_month_percentage) : null,
      ai_insights: row.ai_insights,
      generated_at: row.generated_at?.toISOString() || new Date().toISOString(),
      generation_type: row.generation_type || 'manual',
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    };
  }
}
