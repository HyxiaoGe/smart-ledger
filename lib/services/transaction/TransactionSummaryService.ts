/**
 * 交易汇总服务
 * 负责交易数据的汇总和统计计算
 */

import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type { Transaction } from '@/types/transaction';
import { CacheDecorator } from '@/lib/infrastructure/cache';
import type { ICache } from '@/lib/infrastructure/cache';

/**
 * 月度汇总结果
 */
export interface MonthSummaryResult {
  monthItems: DailySummary[];
  monthTotalAmount: number;
  monthTotalCount: number;
}

/**
 * 日度汇总
 */
export interface DailySummary {
  date: string;
  total: number;
  count: number;
}

/**
 * 分类汇总
 */
export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

/**
 * 交易汇总服务
 */
export class TransactionSummaryService {
  private cacheDecorator: CacheDecorator;

  constructor(
    private readonly repository: ITransactionRepository,
    cache: ICache
  ) {
    this.cacheDecorator = new CacheDecorator(cache, {
      ttl: 300 * 1000, // 5分钟
      tags: ['transactions'],
      debug: false
    });
  }

  /**
   * 获取当前月份汇总
   */
  async getCurrentMonthSummary(): Promise<MonthSummaryResult> {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const cacheKey = `summary:month:${currentMonth}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)
          .toISOString()
          .slice(0, 10);

        // 查询月度数据
        const monthData = await this.repository.findByDateRange(monthStart, monthEnd, 'expense');

        // 按日期聚合
        const monthDaily = this.aggregateByDate(monthData);

        // 计算汇总统计
        const monthItems = Array.from(monthDaily.entries()).map(([date, v]) => ({
          date,
          total: v.total,
          count: v.count
        }));

        const monthTotalAmount = monthItems.reduce((sum, item) => sum + item.total, 0);
        const monthTotalCount = monthItems.reduce((sum, item) => sum + item.count, 0);

        return { monthItems, monthTotalAmount, monthTotalCount };
      },
      { ttl: 300 * 1000 }
    );
  }

  /**
   * 获取指定月份汇总
   */
  async getMonthSummary(year: number, month: number): Promise<MonthSummaryResult> {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const cacheKey = `summary:month:${monthStr}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10);
        const monthEnd = new Date(year, month, 1).toISOString().slice(0, 10);

        // 查询月度数据
        const monthData = await this.repository.findByDateRange(monthStart, monthEnd, 'expense');

        // 按日期聚合
        const monthDaily = this.aggregateByDate(monthData);

        // 计算汇总统计
        const monthItems = Array.from(monthDaily.entries()).map(([date, v]) => ({
          date,
          total: v.total,
          count: v.count
        }));

        const monthTotalAmount = monthItems.reduce((sum, item) => sum + item.total, 0);
        const monthTotalCount = monthItems.reduce((sum, item) => sum + item.count, 0);

        return { monthItems, monthTotalAmount, monthTotalCount };
      },
      { ttl: 300 * 1000 }
    );
  }

  /**
   * 获取分类汇总
   */
  async getCategorySummary(year: number, month: number): Promise<CategorySummary[]> {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const cacheKey = `summary:category:${monthStr}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10);
        const monthEnd = new Date(year, month, 1).toISOString().slice(0, 10);

        // 使用 Repository 的分类统计功能
        const stats = await this.repository.getStatsByCategory({
          type: 'expense',
          startDate: monthStart,
          endDate: monthEnd
        });

        return stats.map((stat) => ({
          category: stat.category,
          total: stat.totalAmount,
          count: stat.count,
          percentage: stat.percentage
        }));
      },
      { ttl: 300 * 1000 }
    );
  }

  /**
   * 获取日期范围汇总
   */
  async getDateRangeSummary(startDate: string, endDate: string): Promise<MonthSummaryResult> {
    const cacheKey = `summary:range:${startDate}:${endDate}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        const data = await this.repository.findByDateRange(startDate, endDate, 'expense');

        const daily = this.aggregateByDate(data);

        const items = Array.from(daily.entries()).map(([date, v]) => ({
          date,
          total: v.total,
          count: v.count
        }));

        const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
        const totalCount = items.reduce((sum, item) => sum + item.count, 0);

        return {
          monthItems: items,
          monthTotalAmount: totalAmount,
          monthTotalCount: totalCount
        };
      },
      { ttl: 300 * 1000 }
    );
  }

  /**
   * 获取交易统计信息
   */
  async getStats(startDate: string, endDate: string) {
    const cacheKey = `stats:${startDate}:${endDate}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        return this.repository.getStats({
          type: 'expense',
          startDate,
          endDate
        });
      },
      { ttl: 300 * 1000 }
    );
  }

  /**
   * 按日期聚合交易
   */
  private aggregateByDate(
    transactions: Transaction[]
  ): Map<string, { total: number; count: number }> {
    const daily = new Map<string, { total: number; count: number }>();

    for (const transaction of transactions) {
      const key = transaction.date;
      const current = daily.get(key) || { total: 0, count: 0 };
      daily.set(key, {
        total: current.total + Number(transaction.amount || 0),
        count: current.count + 1
      });
    }

    return daily;
  }

  /**
   * 清空汇总缓存
   */
  clearCache(): void {
    this.cacheDecorator.invalidateByPrefix('summary:');
    this.cacheDecorator.invalidateByPrefix('stats:');
  }
}
