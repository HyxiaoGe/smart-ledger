import nextDynamic from 'next/dynamic';
import { CollapsibleTransactionList } from '@/components/features/transactions/TransactionList/CollapsibleList';
import { SkeletonBlock, SkeletonGrid } from '@/components/shared/Skeletons';
import type { TransactionRecordsPageViewData } from '@/lib/services/transaction/index.server';
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
    <div className="container space-y-8">
      <RecordsPageHeader headerView={headerView} />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">本期概览</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            先确认总额、笔数和预算关系，再决定是否需要下钻。
          </p>
        </div>
        <SummaryModule {...summaryView} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">结构分析</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            用分类和商户分布判断变化是结构性问题，还是个别大额支出造成。
          </p>
        </div>
        <CategoryModule {...categoryStatisticsView} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">账单明细</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            这里更适合做纠错和定位。先用快捷范围和分类过滤，再展开看具体记录。
          </p>
        </div>
        <CollapsibleTransactionList {...listView} />
      </section>
    </div>
  );
}
