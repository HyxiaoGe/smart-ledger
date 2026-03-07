'use client';

import { useCallback, useState } from 'react';

export function useQuickSuccessToast() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showSuccessToast = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
  }, []);

  const hideSuccessToast = useCallback(() => {
    setShowToast(false);
  }, []);

  return {
    showToast,
    toastMessage,
    showSuccessToast,
    hideSuccessToast,
  };
}
