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
  mainResult: TransactionQueryResult;
  yesterdayData: any[];
  monthSummary: MonthSummaryResult;
  aiAnalysisData: AIAnalysisData;
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

    const [mainResult, yesterdayData, monthSummary, aiAnalysisData] = await Promise.all([
      this.queryService.listByRange(params.month, range, params.startDate, params.endDate),
      this.queryService.listYesterdayTransactions(range),
      this.summaryService.getCurrentMonthSummary(),
      this.analyticsService.getAIAnalysisData(params.month),
    ]);

    return {
      mainResult,
      yesterdayData,
      monthSummary,
      aiAnalysisData,
    };
  }
}
