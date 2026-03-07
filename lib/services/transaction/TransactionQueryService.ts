/**
 * 交易查询服务
 * 负责所有交易数据的查询逻辑
 */

import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type { Transaction, TransactionType } from '@/types/domain/transaction';
import { CacheDecorator } from '@/lib/infrastructure/cache';
import type { ICache } from '@/lib/infrastructure/cache';
import { formatDateToLocal } from '@/lib/utils/date';
import { resolveTransactionRange } from './TransactionRange';

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
    const today = formatDateToLocal(new Date());
    const cacheKey = `transactions:range:${month ?? 'all'}:${range ?? 'today'}:${startDate ?? 'none'}:${endDate ?? 'none'}:${today}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        const resolved = resolveTransactionRange({
          month,
          range,
          startDate,
          endDate
        });

        if (!resolved) {
          // 不支持的范围类型，返回空数据
          return { rows: [], monthLabel: '无效范围' };
        }

        // 根据日期范围查询
        const transactions = await this.queryByDateRange(resolved.queryStart, resolved.queryEnd);

        return {
          rows: transactions,
          monthLabel: resolved.label
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
    const yesterdayStr = formatDateToLocal(yesterday);

    const cacheKey = `transactions:yesterday:${range ?? 'none'}:${yesterdayStr}`;

    return this.cacheDecorator.wrap(
      cacheKey,
      async () => {
        if (range !== 'today' && range !== 'yesterday') {
          return [];
        }

        const resolved = resolveTransactionRange({ range: 'yesterday' });
        if (!resolved) return [];

        return this.repository.findByDateRange(
          resolved.queryStart,
          resolved.queryEnd,
          'expense'
        );
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
   * 根据日期范围查询交易
   */
  private async queryByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return this.repository.findByDateRange(startDate, endDate, 'expense');
  }

  /**
   * 清空查询缓存
   */
  clearCache(): void {
    this.cacheDecorator.invalidateByTag('transactions');
  }
}
