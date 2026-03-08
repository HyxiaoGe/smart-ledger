import { getTransactionRecordsPageViewData } from '@/lib/services/transactions.server';
import {
  resolveTransactionRangePageParams,
  type TransactionPageSearchParams,
} from '@/lib/services/transaction/pageParams';
import { RecordsPageContent } from './components/RecordsPageContent';

export const dynamic = 'force-dynamic';

export default async function RecordsPage({
  searchParams
}: {
  searchParams?: TransactionPageSearchParams;
}) {
  const { month, range, start, end } = resolveTransactionRangePageParams(searchParams);

  const viewData = await getTransactionRecordsPageViewData(month, range, start, end);

  return <RecordsPageContent viewData={viewData} />;
}
