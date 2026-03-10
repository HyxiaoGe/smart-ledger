'use client';

import { useRouter } from 'next/navigation';
import { useRouterRefreshOnDataSync } from '@/hooks/useEnhancedDataSync';

export function RecordsPageSyncBridge() {
  const router = useRouter();

  useRouterRefreshOnDataSync(router);

  return null;
}
