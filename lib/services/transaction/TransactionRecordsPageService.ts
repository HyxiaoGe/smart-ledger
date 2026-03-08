import { partitionExpenseTransactions } from '@/lib/domain/records';
import { getCurrentMonthlyBudgetAmount } from '@/lib/services/budgetService.server';
import type { Transaction } from '@/types/domain/transaction';
import { TransactionAnalyticsService, type AIAnalysisData } from './TransactionAnalyticsService';
import {
  TransactionQueryService,
  type TransactionQueryResult,
} from './TransactionQueryService';
import {
  TransactionSummaryService,
  type MonthSummaryResult,
} from './TransactionSummaryService';

export interface TransactionRecordsPageData {
  mainResult: TransactionRecordsMainResult;
  yesterdayData: any[];
  monthSummary: MonthSummaryResult;
  aiAnalysisData: AIAnalysisData;
}

export interface TransactionRecordsPageViewData extends TransactionRecordsPageData {
  monthlyBudget: number;
}

export interface TransactionRecordsMainResult extends TransactionQueryResult {
  expenseTransactions: Transaction[];
  dailyItems: Array<{ date: string; total: number; count: number }>;
  totalCount: number;
}

export class TransactionRecordsPageService {
  constructor(
    private readonly queryService: TransactionQueryService,
    private readonly summaryService: TransactionSummaryService,
    private readonly analyticsService: TransactionAnalyticsService
  ) {}

  async getPageData(params: {
    month?: string;
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionRecordsPageData> {
    const range = params.range || 'today';

    const [queryResult, yesterdayData, monthSummary, aiAnalysisData] = await Promise.all([
      this.queryService.listByRange(params.month, range, params.startDate, params.endDate),
      this.queryService.listYesterdayTransactions(range),
      this.summaryService.getCurrentMonthSummary(),
      this.analyticsService.getAIAnalysisData(params.month),
    ]);

    const { expenseTransactions, dailyItems } = partitionExpenseTransactions(
      queryResult.rows
    );

    const mainResult: TransactionRecordsMainResult = {
      ...queryResult,
      expenseTransactions,
      dailyItems,
      totalCount: queryResult.rows.length,
    };

    return {
      mainResult,
      yesterdayData,
      monthSummary,
      aiAnalysisData,
    };
  }

  async getPageViewData(params: {
    month?: string;
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionRecordsPageViewData> {
    try {
      const [pageData, monthlyBudget] = await Promise.all([
        this.getPageData(params),
        getCurrentMonthlyBudgetAmount(),
      ]);

      return {
        ...pageData,
        monthlyBudget,
      };
    } catch {
      return {
        ...this.buildEmptyPageData(),
        monthlyBudget: 5000,
      };
    }
  }

  private buildEmptyPageData(): TransactionRecordsPageData {
    return {
      mainResult: {
        rows: [],
        monthLabel: '全部',
        expenseTransactions: [],
        dailyItems: [],
        totalCount: 0,
      },
      yesterdayData: [],
      monthSummary: {
        monthItems: [],
        monthTotalAmount: 0,
        monthTotalCount: 0,
      },
      aiAnalysisData: {
        currentMonthFull: [],
        lastMonth: [],
        currentMonthTop20: [],
        currentMonthStr: '',
        lastMonthStr: '',
      },
    };
  }
}
