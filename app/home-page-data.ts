import { getTransactionDashboardData } from '@/lib/services/transactions.server';
import type { HomePageRequestParams } from '@/lib/services/transaction/pageParams';
import type { TransactionDashboardResult } from '@/lib/services/transaction/index.server';

export type PageData = TransactionDashboardResult;

export async function loadPageData(params: HomePageRequestParams): Promise<PageData> {
  return getTransactionDashboardData({
    currency: params.currency,
    month: params.monthLabel,
    range: params.range,
    startDate: params.start,
    endDate: params.end,
  });
}
