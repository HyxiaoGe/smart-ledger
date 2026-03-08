import HomePageClient from './page-client';
import { loadPageData } from './home-page-data';
import {
  resolveHomePageRequestParams,
  type TransactionPageSearchParams,
} from '@/lib/services/transaction/pageParams';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams?: TransactionPageSearchParams;
}) {
  const pageParams = resolveHomePageRequestParams(searchParams);
  const pageData = await loadPageData(pageParams);

  return (
    <HomePageClient
      data={pageData}
    />
  );
}
