'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseQuickModalNavigationOptions {
  onOpenChange: (open: boolean) => void;
  detailDelayMs?: number;
}

export function useQuickModalNavigation({
  onOpenChange,
  detailDelayMs = 0,
}: UseQuickModalNavigationOptions) {
  const router = useRouter();

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleDetailedEntry = useCallback(() => {
    handleClose();

    if (detailDelayMs <= 0) {
      router.push('/add');
      return;
    }

    window.setTimeout(() => {
      router.push('/add');
    }, detailDelayMs);
  }, [detailDelayMs, handleClose, router]);

  return {
    handleClose,
    handleDetailedEntry,
  };
}
