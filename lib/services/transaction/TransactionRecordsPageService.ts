import { partitionExpenseTransactions } from '@/lib/domain/records';
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
}
