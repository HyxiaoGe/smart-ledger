/**
 * 交易查询服务
 * 负责所有交易数据的查询逻辑
 */

import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type { Transaction, TransactionType } from '@/types/domain/transaction';
import {
  parseMonthStr,
  formatMonth,
  getExtendedQuickRange,
  formatDateToLocal,
  type ExtendedQuickRange,
} from '@/lib/utils/date';
import { CacheDecorator } from '@/lib/infrastructure/cache';
import type { ICache } from '@/lib/infrastructure/cache';

// 扩展日期范围类型列表
const EXTENDED_RANGE_KEYS: ExtendedQuickRange[] = [
  'today', 'yesterday', 'dayBeforeYesterday',
  'thisWeek', 'lastWeek', 'weekBeforeLast',
  'thisMonth', 'lastMonth', 'monthBeforeLast',
  'thisQuarter', 'lastQuarter',
];

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
          dateRange = this.calculateDateRange(range, startDate, endDate);
        } else {
          dateRange = this.calculateMonthRange(month, range);
        }

        if (!dateRange) {
          // 不支持的范围类型，返回空数据
          return { rows: [], monthLabel: '无效范围' };
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
    startDate?: string,
    endDate?: string
  ): DateRange | undefined {
    // 自定义范围
    if (range === 'custom' && startDate && endDate) {
      return { start: startDate, end: endDate, label: `${startDate.slice(5)} ~ ${endDate.slice(5)}` };
    }

    // 扩展的快捷范围类型
    const isExtendedRange = EXTENDED_RANGE_KEYS.includes(range as ExtendedQuickRange);

    if (isExtendedRange) {
      return getExtendedQuickRange(range as ExtendedQuickRange);
    }

    // 不支持的范围类型，返回 undefined（会显示无数据）
    return undefined;
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

    // 使用本地时间格式化，避免时区问题
    const start = formatDateToLocal(new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1));
    const end = formatDateToLocal(new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 1));

    return { start, end, label: formatMonth(parsedMonth) };
  }

  /**
   * 根据日期范围查询交易
   */
  private async queryByDateRange(dateRange: DateRange, range?: string): Promise<Transaction[]> {
    // 单日范围类型列表
    const singleDayRanges = ['today', 'yesterday', 'dayBeforeYesterday'];

    // 特殊处理：单日范围
    if (singleDayRanges.includes(range || '')) {
      // 单日查询使用 [start, end) 模式，end 已经是 start + 1 天
      return this.repository.findByDateRange(dateRange.start, dateRange.end, 'expense');
    }

    // 自定义范围：需要判断是单日还是范围
    if (range === 'custom') {
      // 如果 start === end，说明是单日选择
      if (dateRange.start === dateRange.end) {
        // 单日查询：结束日期需要+1天（因为 repository 使用左闭右开区间）
        const endDate = new Date(dateRange.end);
        endDate.setDate(endDate.getDate() + 1);
        const queryEnd = endDate.toISOString().slice(0, 10);
        return this.repository.findByDateRange(dateRange.start, queryEnd, 'expense');
      } else {
        // 范围查询：结束日期需要+1天（左闭右开）
        const endDate = new Date(dateRange.end);
        endDate.setDate(endDate.getDate() + 1);
        const queryEnd = endDate.toISOString().slice(0, 10);
        return this.repository.findByDateRange(dateRange.start, queryEnd, 'expense');
      }
    }

    // 其他范围（周、月、季）：使用标准的左闭右开查询
    return this.repository.findByDateRange(dateRange.start, dateRange.end, 'expense');
  }

  /**
   * 清空查询缓存
   */
  clearCache(): void {
    this.cacheDecorator.invalidateByTag('transactions');
  }
}
