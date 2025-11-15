/**
 * 交易查询服务
 * 负责所有交易数据的查询逻辑
 */

import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type { Transaction, TransactionType } from '@/types/transaction';
import { parseMonthStr, formatMonth, getQuickRange } from '@/lib/utils/date';
import { CacheDecorator } from '@/lib/infrastructure/cache';
import type { ICache } from '@/lib/infrastructure/cache';

/**
 * 日期范围
 */
type DateRange = { start: string; end: string; label: string };

/**
 * 查询结果
 */
export interface TransactionQueryResult {
  rows: Transaction[];
  monthLabel: string;
}

/**
 * 交易查询服务
 */
export class TransactionQueryService {
  private cacheDecorator: CacheDecorator;

  constructor(
    private readonly repository: ITransactionRepository,
    cache: ICache
  ) {
    this.cacheDecorator = new CacheDecorator(cache, {
      ttl: 60 * 1000, // 60秒
      tags: ['transactions'],
      debug: false
    });
  }

  /**
   * 根据范围查询交易列表
   */
  async listByRange(
    month?: string,
    range?: string,
    startDate?: string,
    endDate?: string
  ): Promise<TransactionQueryResult> {
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `transactions:range:${month ?? 'all'}:${range ?? 'today'}:${startDate ?? 'none'}:${endDate ?? 'none'}:${today}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        let dateRange: DateRange | undefined;

        // 处理不同的范围类型
        if (range && range !== 'month') {
          dateRange = this.calculateDateRange(range, month, startDate, endDate);
        } else {
          dateRange = this.calculateMonthRange(month, range);
        }

        if (!dateRange) {
          // 查询所有数据
          const transactions = await this.repository.findMany(
            { type: 'expense' },
            { field: 'date', order: 'desc' }
          );
          return { rows: transactions.data, monthLabel: '全部' };
        }

        // 根据日期范围查询
        const transactions = await this.queryByDateRange(dateRange, range);

        return {
          rows: transactions,
          monthLabel: dateRange.label
        };
      },
      { ttl: 60 * 1000 }
    );
  }

  /**
   * 查询昨天的交易
   */
  async listYesterdayTransactions(range?: string): Promise<Transaction[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const cacheKey = `transactions:yesterday:${range ?? 'none'}:${yesterdayStr}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        if (range !== 'today' && range !== 'yesterday') {
          return [];
        }

        return this.repository.findByDateRange(yesterdayStr, yesterdayStr, 'expense');
      },
      { ttl: 300 * 1000 } // 5分钟缓存
    );
  }

  /**
   * 查询最近的交易
   */
  async listRecent(limit: number = 10, type?: TransactionType): Promise<Transaction[]> {
    const cacheKey = `transactions:recent:${limit}:${type ?? 'all'}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        return this.repository.findRecent(limit, type);
      },
      { ttl: 30 * 1000 } // 30秒缓存
    );
  }

  /**
   * 根据ID查询交易
   */
  async findById(id: string): Promise<Transaction | null> {
    const cacheKey = `transaction:${id}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        return this.repository.findById(id);
      },
      { ttl: 300 * 1000 } // 5分钟缓存
    );
  }

  /**
   * 根据月份查询交易
   */
  async findByMonth(year: number, month: number, type?: TransactionType): Promise<Transaction[]> {
    const cacheKey = `transactions:month:${year}-${month}:${type ?? 'all'}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        return this.repository.findByMonth(year, month, type);
      },
      { ttl: 60 * 1000 }
    );
  }

  /**
   * 计算日期范围
   */
  private calculateDateRange(
    range: string,
    month?: string,
    startDate?: string,
    endDate?: string
  ): DateRange | undefined {
    if (range === 'custom' && startDate && endDate) {
      return { start: startDate, end: endDate, label: `${startDate} - ${endDate}` };
    }

    return getQuickRange(range as any, month);
  }

  /**
   * 计算月份范围
   */
  private calculateMonthRange(month?: string, range?: string): DateRange | undefined {
    let parsedMonth: Date | null = null;

    if (range === 'month') {
      parsedMonth = new Date();
    } else {
      parsedMonth = parseMonthStr(month || formatMonth(new Date()));
    }

    if (!parsedMonth) {
      return undefined;
    }

    const start = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const end = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);

    return { start, end, label: formatMonth(parsedMonth) };
  }

  /**
   * 根据日期范围查询交易
   */
  private async queryByDateRange(dateRange: DateRange, range?: string): Promise<Transaction[]> {
    // 特殊处理：今天或昨天使用精确日期匹配
    if ((range === 'today' || range === 'yesterday') && dateRange.start === dateRange.end) {
      return this.repository.findByDateRange(dateRange.start, dateRange.start, 'expense');
    }

    // 自定义范围：需要调整结束日期
    if (range === 'custom') {
      const end = new Date(dateRange.end);
      end.setDate(end.getDate() + 1);
      const endDateStr = end.toISOString().slice(0, 10);
      return this.repository.findByDateRange(dateRange.start, endDateStr, 'expense');
    }

    // 其他范围：使用标准查询
    return this.repository.findByDateRange(dateRange.start, dateRange.end, 'expense');
  }

  /**
   * 清空查询缓存
   */
  clearCache(): void {
    this.cacheDecorator.invalidateByTag('transactions');
  }
}
