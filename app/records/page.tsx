import nextDynamic from 'next/dynamic';
import { getTransactionRecordsPageViewData } from '@/lib/services/transactions.server';
import { TabsRangePicker } from '@/components/shared/TabsRangePicker';
import { CollapsibleTransactionList } from '@/components/features/transactions/TransactionList/CollapsibleList';
import { SkeletonBlock, SkeletonGrid } from '@/components/shared/Skeletons';
import { AIAnalysisButton } from '@/components/features/ai-analysis/AIAnalysisButton';
import {
  resolveTransactionRangePageParams,
  type TransactionPageSearchParams,
} from '@/lib/services/transaction/pageParams';

export const dynamic = 'force-dynamic';

const SummaryModule = nextDynamic(
  () => import('@/components/MonthlyExpenseSummary').then((mod) => mod.MonthlyExpenseSummary),
  {
    loading: () => (
      <SkeletonGrid
        count={2}
        className="grid gap-4 md:grid-cols-2"
        itemClassName="h-60 rounded-xl"
      />
    )
  }
);

const CategoryModule = nextDynamic(
  () => import('@/components/features/statistics/CategoryStatistics').then((mod) => mod.CategoryStatistics),
  {
    loading: () => <SkeletonBlock className="h-96 rounded-xl" />
  }
);

export default async function RecordsPage({
  searchParams
}: {
  searchParams?: TransactionPageSearchParams;
}) {
  const { month, range, start, end } = resolveTransactionRangePageParams(searchParams);

  const {
    mainResult,
    headerTitle,
    summaryView,
    categoryStatisticsView,
    aiAnalysisView,
  } = await getTransactionRecordsPageViewData(month, range, start, end);
  const { rows, totalCount } = mainResult;

  return (
    <>
      <div className="container space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{headerTitle}</h1>
          <div className="flex items-center gap-4">
            <TabsRangePicker />
            <AIAnalysisButton {...aiAnalysisView} />
          </div>
        </div>

        {/* 统计面板 - 所有范围都显示 */}
        <>
          <SummaryModule {...summaryView} />

          <CategoryModule {...categoryStatisticsView} />
        </>

        {/* 交易明细列表 - 带收纳功能 */}
        <CollapsibleTransactionList initialTransactions={rows} totalCount={totalCount} />
      </div>
    </>
  );
}
