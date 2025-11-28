/**
 * Prisma 周报告仓储实现
 */

import type { PrismaClient } from '@/generated/prisma/client';
import type {
  IWeeklyReportRepository,
  WeeklyReport,
  CreateWeeklyReportDTO,
  WeeklyReportGenerationResult,
  CategoryStat,
  MerchantStat,
  PaymentMethodStat,
} from '@/lib/domain/repositories/IWeeklyReportRepository';

export class PrismaWeeklyReportRepository implements IWeeklyReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<WeeklyReport | null> {
    const data = await this.prisma.weekly_reports.findUnique({
      where: { id: BigInt(id) },
    });
    return data ? this.mapToEntity(data) : null;
  }

  async findAll(): Promise<WeeklyReport[]> {
    const data = await this.prisma.weekly_reports.findMany({
      orderBy: { week_start_date: 'desc' },
    });
    return data.map(this.mapToEntity);
  }

  async findLatest(): Promise<WeeklyReport | null> {
    const data = await this.prisma.weekly_reports.findFirst({
      orderBy: { week_start_date: 'desc' },
    });
    return data ? this.mapToEntity(data) : null;
  }

  async findByDateRange(startDate: string, endDate: string): Promise<WeeklyReport[]> {
    const data = await this.prisma.weekly_reports.findMany({
      where: {
        week_start_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { week_start_date: 'desc' },
    });
    return data.map(this.mapToEntity);
  }

  async existsForWeek(weekStartDate: string): Promise<boolean> {
    const count = await this.prisma.weekly_reports.count({
      where: { week_start_date: new Date(weekStartDate) },
    });
    return count > 0;
  }

  async create(data: CreateWeeklyReportDTO): Promise<WeeklyReport> {
    const result = await this.prisma.weekly_reports.create({
      data: {
        week_start_date: new Date(data.week_start_date),
        week_end_date: new Date(data.week_end_date),
        total_expenses: data.total_expenses,
        transaction_count: data.transaction_count,
        average_transaction: data.average_transaction,
        category_breakdown: data.category_breakdown as any || [],
        top_merchants: data.top_merchants as any || [],
        payment_method_stats: data.payment_method_stats as any || [],
        week_over_week_change: data.week_over_week_change,
        week_over_week_percentage: data.week_over_week_percentage,
        ai_insights: data.ai_insights,
        generation_type: data.generation_type || 'manual',
        generated_at: new Date(),
      },
    });

    return this.mapToEntity(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.weekly_reports.delete({
      where: { id: BigInt(id) },
    });
  }

  async generate(weekStartDate?: string): Promise<WeeklyReportGenerationResult> {
    // 计算本周的开始和结束日期
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (weekStartDate) {
      startDate = new Date(weekStartDate);
    } else {
      // 默认为上周
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay() - 7); // 上周日
      startDate.setHours(0, 0, 0, 0);
    }

    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // 周六
    endDate.setHours(23, 59, 59, 999);

    const weekStartStr = startDate.toISOString().split('T')[0];
    const weekEndStr = endDate.toISOString().split('T')[0];

    // 检查是否已存在
    const exists = await this.existsForWeek(weekStartStr);
    if (exists) {
      return {
        success: false,
        message: `${weekStartStr} 至 ${weekEndStr} 的周报告已存在`,
      };
    }

    // 查询本周交易
    const transactions = await this.prisma.transactions.findMany({
      where: {
        deleted_at: null,
        type: 'expense',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (transactions.length === 0) {
      return {
        success: false,
        message: '本周没有支出记录，无法生成报告',
      };
    }

    // 计算统计数据
    const totalExpenses = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const transactionCount = transactions.length;
    const avgTransaction = totalExpenses / transactionCount;

    // 分类统计
    const categoryMap = new Map<string, { amount: number; count: number }>();
    transactions.forEach((t) => {
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
        percentage: (stats.amount / totalExpenses) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 商家统计
    const merchantMap = new Map<string, { amount: number; count: number }>();
    transactions.forEach((t) => {
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
      .slice(0, 5);

    // 支付方式统计
    const paymentMap = new Map<string, { amount: number; count: number }>();
    transactions.forEach((t) => {
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
        percentage: (stats.amount / totalExpenses) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 计算环比变化
    const lastWeekStart = new Date(startDate);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(endDate);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const lastWeekTransactions = await this.prisma.transactions.findMany({
      where: {
        deleted_at: null,
        type: 'expense',
        date: {
          gte: lastWeekStart,
          lte: lastWeekEnd,
        },
      },
    });

    const lastWeekTotal = lastWeekTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const weekOverWeekChange = totalExpenses - lastWeekTotal;
    const weekOverWeekPercentage = lastWeekTotal > 0
      ? ((totalExpenses - lastWeekTotal) / lastWeekTotal) * 100
      : 0;

    // 创建报告
    const report = await this.create({
      week_start_date: weekStartStr,
      week_end_date: weekEndStr,
      total_expenses: totalExpenses,
      transaction_count: transactionCount,
      average_transaction: avgTransaction,
      category_breakdown: categoryBreakdown,
      top_merchants: topMerchants,
      payment_method_stats: paymentMethodStats,
      week_over_week_change: weekOverWeekChange,
      week_over_week_percentage: weekOverWeekPercentage,
      generation_type: 'manual',
    });

    return {
      success: true,
      message: '周报告生成成功',
      report,
    };
  }

  private mapToEntity(row: any): WeeklyReport {
    return {
      id: row.id.toString(),
      user_id: row.user_id,
      week_start_date: row.week_start_date instanceof Date
        ? row.week_start_date.toISOString().split('T')[0]
        : row.week_start_date,
      week_end_date: row.week_end_date instanceof Date
        ? row.week_end_date.toISOString().split('T')[0]
        : row.week_end_date,
      total_expenses: Number(row.total_expenses),
      transaction_count: row.transaction_count,
      average_transaction: row.average_transaction ? Number(row.average_transaction) : null,
      category_breakdown: (row.category_breakdown as CategoryStat[]) || [],
      top_merchants: (row.top_merchants as MerchantStat[]) || [],
      payment_method_stats: (row.payment_method_stats as PaymentMethodStat[]) || [],
      week_over_week_change: row.week_over_week_change ? Number(row.week_over_week_change) : null,
      week_over_week_percentage: row.week_over_week_percentage ? Number(row.week_over_week_percentage) : null,
      ai_insights: row.ai_insights,
      generated_at: row.generated_at?.toISOString() || new Date().toISOString(),
      generation_type: row.generation_type || 'auto',
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
    };
  }
}
