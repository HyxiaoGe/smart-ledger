import nextDynamic from 'next/dynamic';
import { CollapsibleTransactionList } from '@/components/features/transactions/TransactionList/CollapsibleList';
import { SkeletonBlock, SkeletonGrid } from '@/components/shared/Skeletons';
import type { TransactionRecordsPageViewData } from '@/lib/services/transaction';
import { RecordsPageHeader } from './RecordsPageHeader';

const SummaryModule = nextDynamic(
  () => import('@/components/MonthlyExpenseSummary').then((mod) => mod.MonthlyExpenseSummary),
  {
    loading: () => (
      <SkeletonGrid
        count={2}
        className="grid gap-4 md:grid-cols-2"
        itemClassName="h-60 rounded-xl"
      />
    ),
  }
);

const CategoryModule = nextDynamic(
  () =>
    import('@/components/features/statistics/CategoryStatistics').then(
      (mod) => mod.CategoryStatistics
    ),
  {
    loading: () => <SkeletonBlock className="h-96 rounded-xl" />,
  }
);

interface RecordsPageContentProps {
  viewData: TransactionRecordsPageViewData;
}

export function RecordsPageContent({
  viewData: { headerView, summaryView, categoryStatisticsView, listView },
}: RecordsPageContentProps) {
  return (
    <div className="container space-y-6">
      <RecordsPageHeader headerView={headerView} />

      <SummaryModule {...summaryView} />
      <CategoryModule {...categoryStatisticsView} />
      <CollapsibleTransactionList {...listView} />
    </div>
  );
}
