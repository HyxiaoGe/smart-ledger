'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePaymentMethods } from '@/lib/api/hooks/usePaymentMethods';
import {
  useDeleteTransaction,
  useRestoreTransaction,
  useUpdateTransaction,
} from '@/lib/api/hooks/useTransactions';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';
import type { UpdateTransactionParams } from '@/lib/api/services/transactions';
import { buildHierarchicalData, type Transaction } from './types';

function sanitizeUpdatePatch(form: Partial<Transaction>): Omit<UpdateTransactionParams, 'id'> {
  const patch = { ...form, type: 'expense' as const };
  delete (patch as Partial<Transaction> & { id?: string }).id;
  return patch;
}

export function useTransactionListMutationState(initialTransactions: Transaction[]) {
  const recentlyDeletedRef = useRef<Transaction | null>(null);

  const [error, setError] = useState('');
  const [recentlyDeleted, setRecentlyDeleted] = useState<Transaction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Transaction>>({});
  const [confirmRow, setConfirmRow] = useState<Transaction | null>(null);
  const [showEditToast, setShowEditToast] = useState(false);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [deletedTransactionIds, setDeletedTransactionIds] = useState<Set<string>>(new Set());
  const [transactionOverrides, setTransactionOverrides] = useState<Record<string, Transaction>>({});
  const [restoredTransactions, setRestoredTransactions] = useState<Record<string, Transaction>>({});

  useEffect(() => {
    recentlyDeletedRef.current = recentlyDeleted;
  }, [recentlyDeleted]);

  useEffect(() => {
    setDeletedTransactionIds(new Set());
    setTransactionOverrides({});
    setRestoredTransactions({});
  }, [initialTransactions]);

  const { data: paymentMethodsData } = usePaymentMethods();
  const paymentMethods = paymentMethodsData || [];

  const transactions = useMemo(() => {
    const merged = initialTransactions
      .filter((item) => !deletedTransactionIds.has(item.id))
      .map((item) => transactionOverrides[item.id] || item);

    const missingRestored = Object.values(restoredTransactions).filter(
      (item) => !merged.some((row) => row.id === item.id)
    );

    return [...missingRestored, ...merged].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [deletedTransactionIds, initialTransactions, restoredTransactions, transactionOverrides]);

  const hierarchicalData = useMemo(() => buildHierarchicalData(transactions), [transactions]);
  const sortedDates = useMemo(
    () =>
      Object.keys(hierarchicalData).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      ),
    [hierarchicalData]
  );

  const updateMutation = useUpdateTransaction({
    onSuccess: (result, variables) => {
      const existingTransaction =
        transactions.find((item) => item.id === variables.id) || ({} as Transaction);
      const updatedTransaction =
        result || ({ ...existingTransaction, ...form, type: 'expense' } as Transaction);

      setTransactionOverrides((current) => ({
        ...current,
        [variables.id]: {
          ...existingTransaction,
          ...updatedTransaction,
        },
      }));
      setEditingId(null);
      setForm({});
      setShowEditToast(true);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : '更新失败');
    },
  });

  const deleteMutation = useDeleteTransaction({
    onSuccess: (_, id) => {
      const transaction = transactions.find((item) => item.id === id);
      if (!transaction) return;

      setRecentlyDeleted(transaction);
      setDeletedTransactionIds((current) => new Set([...current, id]));
      setTransactionOverrides((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setRestoredTransactions((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setShowDeleteToast(true);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : '删除失败');
    },
  });

  const restoreMutation = useRestoreTransaction({
    onSuccess: (restoredTransaction) => {
      const deletedTransaction = recentlyDeletedRef.current;
      if (!deletedTransaction) return;

      const restoredRow = restoredTransaction || deletedTransaction;
      setDeletedTransactionIds((current) => {
        const next = new Set(current);
        next.delete(deletedTransaction.id);
        return next;
      });
      setRestoredTransactions((current) => ({
        ...current,
        [restoredRow.id]: restoredRow,
      }));
      setShowUndoToast(true);
      setRecentlyDeleted(null);
    },
    onError: () => {
      setError('撤销失败，请重试');
    },
  });

  const loading = updateMutation.isPending || deleteMutation.isPending || restoreMutation.isPending;

  function handleEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setForm({ ...transaction });
  }

  function saveEdit() {
    if (!editingId) return;
    setError('');
    const patch = sanitizeUpdatePatch(form);
    if (patch.amount !== undefined && !(Number(patch.amount) > 0)) {
      setError('金额必须大于 0');
      return;
    }
    updateMutation.mutate({ id: editingId, ...patch });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({});
  }

  function handleDelete(transaction: Transaction) {
    setConfirmRow(transaction);
  }

  function confirmDelete(transaction: Transaction) {
    setError('');
    setConfirmRow(null);
    deleteMutation.mutate(transaction.id);
  }

  function handleUndo() {
    if (!recentlyDeleted) return;
    restoreMutation.mutate(recentlyDeleted.id);
  }

  return {
    paymentMethods: paymentMethods as PaymentMethod[],
    hierarchicalData,
    sortedDates,
    loading,
    error,
    recentlyDeleted,
    confirmRow,
    editingId,
    form,
    setForm,
    showEditToast,
    setShowEditToast,
    showDeleteToast,
    setShowDeleteToast,
    showUndoToast,
    setShowUndoToast,
    handleEdit,
    saveEdit,
    cancelEdit,
    handleDelete,
    confirmDelete,
    handleUndo,
    closeConfirmDialog: () => setConfirmRow(null),
  };
}
