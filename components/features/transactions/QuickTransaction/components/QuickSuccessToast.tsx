'use client';

import { ProgressToast } from '@/components/shared/ProgressToast';

interface QuickSuccessToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export function QuickSuccessToast({
  open,
  message,
  onClose,
}: QuickSuccessToastProps) {
  if (!open || !message) {
    return null;
  }

  return <ProgressToast message={message} duration={2000} onClose={onClose} />;
}
