'use client';

import { useCallback, useState } from 'react';
import { formatDateToLocal } from '@/lib/utils/date';
import { useCreateTransaction } from '@/lib/api/hooks';
import type { QuickTransactionSuggestion } from '@/lib/api/services/ai';
import { useQuickSuccessToast } from './useQuickSuccessToast';

interface QuickSuggestionSubmissionOptions {
  onSuccess?: (suggestion: QuickTransactionSuggestion) => void;
  afterSuccess?: () => void;
  refreshSuggestions?: () => void | Promise<unknown>;
  refreshDelayMs?: number;
  getSuccessMessage?: (suggestion: QuickTransactionSuggestion) => string;
}

export function useQuickSuggestionSubmission(options?: QuickSuggestionSubmissionOptions) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [lastSuccessSuggestion, setLastSuccessSuggestion] =
    useState<QuickTransactionSuggestion | null>(null);
  const createTransaction = useCreateTransaction();
  const { hideSuccessToast, showSuccessToast, showToast, toastMessage } = useQuickSuccessToast();

  const submitSuggestion = useCallback(
    async (suggestion: QuickTransactionSuggestion) => {
      setSubmittingId(suggestion.id);

      try {
        await createTransaction.mutateAsync({
          type: 'expense',
          category: suggestion.category,
          amount: suggestion.amount,
          note: suggestion.note,
          date: formatDateToLocal(new Date()),
          currency: 'CNY',
        });

        setLastSuccessSuggestion(suggestion);
        showSuccessToast(
          options?.getSuccessMessage?.(suggestion) ||
            `${suggestion.title} (¥${suggestion.amount}) 记账成功！`
        );
        options?.onSuccess?.(suggestion);

        const delay = options?.refreshDelayMs ?? 1000;
        window.setTimeout(() => {
          void options?.refreshSuggestions?.();
          options?.afterSuccess?.();
        }, delay);
      } finally {
        setSubmittingId(null);
      }
    },
    [createTransaction, options]
  );

  return {
    createTransaction,
    submitSuggestion,
    submittingId,
    showToast,
    hideSuccessToast,
    lastSuccessSuggestion,
    toastMessage,
  };
}
