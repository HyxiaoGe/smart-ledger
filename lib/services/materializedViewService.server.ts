/**
 * 物化视图服务 - 服务端版本
 * 查询预计算的统计数据，避免实时聚合
 */

import { prisma } from '@/lib/clients/db/prisma';
import { CacheDecorator, memoryCache } from '@/lib/infrastructure/cache';

// 创建缓存装饰器实例
const cacheDecorator = new CacheDecorator(memoryCache, {
  ttl: 60 * 1000, // 60秒缓存（物化视图本身每小时刷新）
  tags: ['materialized-views'],
  debug: false,
});

/**
 * 月度汇总数据
 */
export interface MonthlySummary {
  month: Date;
  currency: string;
  type: string;
  transactionCount: number;
  totalAmount: number;
  avgAmount: number;
  maxAmount: number;
  minAmount: number;
  categoryCount: number;
  activeDays: number;
  merchantCount: number;
}

/**
 * 分类月度统计
 */
export interface CategoryMonthlyStat {
  month: Date;
  category: string;
  currency: string;
  type: string;
  transactionCount: number;
  totalAmount: number;
  avgAmount: number;
  maxAmount: number;
  minAmount: number;
  activeDays: number;
  merchantCount: number;
  subcategories: string[];
}

/**
 * 每日汇总
 */
export interface DailySummary {
  date: Date;
  currency: string;
  type: string;
  transactionCount: number;
  totalAmount: number;
  avgAmount: number;
}

/**
 * 获取月度汇总数据（从物化视图）
 */
export async function getMonthlySummary(
  year: number,
  month: number,
  currency: string = 'CNY',
  type: string = 'expense'
): Promise<MonthlySummary | null> {
  const cacheKey = `mv:monthly:${year}-${month}:${currency}:${type}`;

  return cacheDecorator.wrap(cacheKey, async () => {
    const monthStart = new Date(year, month - 1, 1);

    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT
          month,
          currency,
          type,
          transaction_count::int as "transactionCount",
          total_amount::float as "totalAmount",
          avg_amount::float as "avgAmount",
          max_amount::float as "maxAmount",
          min_amount::float as "minAmount",
          category_count::int as "categoryCount",
          active_days::int as "activeDays",
          merchant_count::int as "merchantCount"
        FROM mv_monthly_summary
        WHERE month = ${monthStart}
          AND currency = ${currency}
          AND type = ${type}
      `;

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('获取月度汇总失败:', error);
      return null;
    }
  });
}

/**
 * 获取多月汇总数据（用于对比）
 */
export async function getMonthlyComparison(
  months: { year: number; month: number }[],
  currency: string = 'CNY',
  type: string = 'expense'
): Promise<MonthlySummary[]> {
  const cacheKey = `mv:monthly-compare:${JSON.stringify(months)}:${currency}:${type}`;

  return cacheDecorator.wrap(cacheKey, async () => {
    const monthDates = months.map(m => new Date(m.year, m.month - 1, 1));

    try {
      const results = await prisma.$queryRaw<any[]>`
        SELECT
          month,
          currency,
          type,
          transaction_count::int as "transactionCount",
          total_amount::float as "totalAmount",
          avg_amount::float as "avgAmount",
          max_amount::float as "maxAmount",
          min_amount::float as "minAmount",
          category_count::int as "categoryCount",
          active_days::int as "activeDays",
          merchant_count::int as "merchantCount"
        FROM mv_monthly_summary
        WHERE month = ANY(${monthDates})
          AND currency = ${currency}
          AND type = ${type}
        ORDER BY month DESC
      `;

      return results;
    } catch (error) {
      console.error('获取月度对比数据失败:', error);
      return [];
    }
  });
}

/**
 * 获取分类月度统计（从物化视图）
 */
export async function getCategoryMonthlyStat(
  year: number,
  month: number,
  currency: string = 'CNY',
  type: string = 'expense'
): Promise<CategoryMonthlyStat[]> {
  const cacheKey = `mv:category:${year}-${month}:${currency}:${type}`;

  return cacheDecorator.wrap(cacheKey, async () => {
    const monthStart = new Date(year, month - 1, 1);

    try {
      const results = await prisma.$queryRaw<any[]>`
        SELECT
          month,
          category,
          currency,
          type,
          transaction_count::int as "transactionCount",
          total_amount::float as "totalAmount",
          avg_amount::float as "avgAmount",
          max_amount::float as "maxAmount",
          min_amount::float as "minAmount",
          active_days::int as "activeDays",
          merchant_count::int as "merchantCount",
          subcategories
        FROM mv_category_monthly_stats
        WHERE month = ${monthStart}
          AND currency = ${currency}
          AND type = ${type}
        ORDER BY total_amount DESC
      `;

      return results;
    } catch (error) {
      console.error('获取分类月度统计失败:', error);
      return [];
    }
  });
}

/**
 * 获取每日汇总（从物化视图）
 */
export async function getDailySummary(
  startDate: Date,
  endDate: Date,
  currency: string = 'CNY',
  type: string = 'expense'
): Promise<DailySummary[]> {
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);
  const cacheKey = `mv:daily:${startStr}:${endStr}:${currency}:${type}`;

  return cacheDecorator.wrap(cacheKey, async () => {
    try {
      const results = await prisma.$queryRaw<any[]>`
        SELECT
          date,
          currency,
          type,
          transaction_count::int as "transactionCount",
          total_amount::float as "totalAmount",
          avg_amount::float as "avgAmount"
        FROM mv_daily_summary
        WHERE date >= ${startDate}
          AND date < ${endDate}
          AND currency = ${currency}
          AND type = ${type}
        ORDER BY date ASC
      `;

      return results;
    } catch (error) {
      console.error('获取每日汇总失败:', error);
      return [];
    }
  });
}

/**
 * 获取月度趋势数据（用于图表）
 */
export async function getMonthlyTrend(
  year: number,
  month: number,
  currency: string = 'CNY'
): Promise<{ name: string; expense: number }[]> {
  const cacheKey = `mv:trend:${year}-${month}:${currency}`;

  return cacheDecorator.wrap(cacheKey, async () => {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    try {
      const results = await prisma.$queryRaw<any[]>`
        SELECT
          EXTRACT(DAY FROM date)::int as day,
          total_amount::float as "totalAmount"
        FROM mv_daily_summary
        WHERE date >= ${monthStart}
          AND date < ${monthEnd}
          AND currency = ${currency}
          AND type = 'expense'
        ORDER BY date ASC
      `;

      return results.map((r: { day: number; totalAmount: number }) => ({
        name: String(r.day),
        expense: r.totalAmount || 0
      }));
    } catch (error) {
      console.error('获取月度趋势失败:', error);
      return [];
    }
  });
}

/**
 * 获取分类饼图数据（用于首页）
 */
export async function getCategoryPieData(
  year: number,
  month: number,
  currency: string = 'CNY'
): Promise<{ name: string; value: number }[]> {
  const cacheKey = `mv:pie:${year}-${month}:${currency}`;

  return cacheDecorator.wrap(cacheKey, async () => {
    const stats = await getCategoryMonthlyStat(year, month, currency, 'expense');

    return stats.map(s => ({
      name: s.category,
      value: s.totalAmount
    }));
  });
}

/**
 * 失效物化视图缓存
 */
export function invalidateMaterializedViewCache(): void {
  cacheDecorator.invalidateByTag('materialized-views');
}
