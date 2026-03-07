'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDateToLocal } from '@/lib/utils/date';
import {
  useCreateTransaction,
  usePaymentMethodsWithDefault,
} from '@/lib/api/hooks';
import type { QuickTransactionItem } from './types';
import { resolveQuickTransactionAmount } from './utils';
import { useQuickSuccessToast } from './useQuickSuccessToast';

interface UseQuickTransactionCardStateOptions {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  refreshTodayTransactions: () => void | Promise<unknown>;
}

export function useQuickTransactionCardState(
  options: UseQuickTransactionCardStateOptions
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submittingItemId, setSubmittingItemId] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const { paymentMethods, defaultPaymentMethodId } = usePaymentMethodsWithDefault();
  const createTransaction = useCreateTransaction();
  const { hideSuccessToast, showSuccessToast, showToast, toastMessage } =
    useQuickSuccessToast();

  useEffect(() => {
    if (!paymentMethod && defaultPaymentMethodId) {
      setPaymentMethod(defaultPaymentMethodId);
    }
  }, [defaultPaymentMethodId, paymentMethod]);

  const handleAmountChange = useCallback((itemId: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomAmounts(prev => ({
        ...prev,
        [itemId]: value,
      }));
    }
  }, []);

  const getCurrentAmount = useCallback(
    (item: QuickTransactionItem) => customAmounts[item.id] || item.suggestedAmount?.toFixed(2) || '',
    [customAmounts]
  );

  const submitQuickTransaction = useCallback(
    async (item: QuickTransactionItem) => {
      const resolvedAmount = resolveQuickTransactionAmount(item, customAmounts[item.id]);
      if (resolvedAmount.error || resolvedAmount.amount === undefined) {
        alert(resolvedAmount.error || '请输入有效金额');
        return;
      }

      try {
        setSubmittingItemId(item.id);
        await createTransaction.mutateAsync({
          type: 'expense',
          category: item.category,
          amount: resolvedAmount.amount,
          note: item.title,
          date: formatDateToLocal(new Date()),
          currency: 'CNY',
          payment_method: paymentMethod || null,
        });

        showSuccessToast(`${item.title} 记账成功！`);
        options.onSuccess?.();
        void options.refreshTodayTransactions();

        if (!item.isFixed) {
          setCustomAmounts(prev => {
            const nextAmounts = { ...prev };
            delete nextAmounts[item.id];
            return nextAmounts;
          });
        }

        window.setTimeout(() => {
          options.onClose();
        }, 1500);
      } catch (error) {
        console.error('快速记账失败:', error);
        alert('记账失败，请重试');
      } finally {
        setSubmittingItemId(null);
        setEditingId(null);
      }
    },
    [createTransaction, customAmounts, options, paymentMethod, showSuccessToast]
  );

  return {
    createTransaction,
    editingId,
    getCurrentAmount,
    handleAmountChange,
    hideSuccessToast,
    paymentMethod,
    paymentMethods,
    setEditingId,
    setPaymentMethod,
    showToast,
    submitQuickTransaction,
    submittingItemId,
    toastMessage,
  };
}
