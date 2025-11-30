"use client";
// 交易分组列表组件（客户端支持编辑和删除）
import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/EmptyState';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { paymentMethodsApi, PaymentMethod } from '@/lib/api/services/payment-methods';
import { transactionsApi } from '@/lib/api/services/transactions';
import { enhancedDataSync } from '@/lib/core/EnhancedDataSync';
import {
  Transaction,
  TransactionGroupedListProps,
  buildHierarchicalData,
} from './types';
import {
  ConfirmDeleteDialog,
  DateGroupRow,
} from './components';

export function TransactionGroupedList({
  initialTransactions,
  className
}: TransactionGroupedListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  // 当 initialTransactions 发生变化时更新本地状态
  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  const [error, setError] = useState<string>('');
  const [recentlyDeleted, setRecentlyDeleted] = useState<Transaction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Transaction>>({});
  const [confirmRow, setConfirmRow] = useState<Transaction | null>(null);
  const [showEditToast, setShowEditToast] = useState(false);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // 折叠状态管理
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set());

  // 使用 React Query 获取支付方式
  const { data: paymentMethodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const response = await paymentMethodsApi.list();
      return Array.isArray(response) ? response : (response as unknown as { data: PaymentMethod[] }).data || [];
    }
  });

  const paymentMethods = paymentMethodsData || [];

  // 更新交易的 mutation
  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: Partial<Transaction> }) =>
      transactionsApi.update({ id: params.id, ...params.data }),
    onSuccess: (result, variables) => {
      const updatedTransaction = result || { ...form, type: 'expense' } as unknown as Transaction;
      setTransactions((ts) => ts.map((t) => (t.id === variables.id ? { ...t, ...updatedTransaction } : t)));
      setEditingId(null);
      setForm({});
      setShowEditToast(true);
      enhancedDataSync.notifyTransactionUpdated(updatedTransaction, true);
    },
    onError: (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : '更新失败';
      setError(errorMessage);
    }
  });

  // 删除交易的 mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: (_, id) => {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        setRecentlyDeleted(transaction);
        setTransactions((ts) => ts.filter((t) => t.id !== id));
        setShowDeleteToast(true);
        enhancedDataSync.notifyTransactionDeleted(transaction, true);
      }
    },
    onError: (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : '删除失败';
      setError(errorMessage);
    }
  });

  // 恢复交易的 mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.restore(id),
    onSuccess: () => {
      if (recentlyDeleted) {
        setTransactions((ts) => [recentlyDeleted, ...ts].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
        setShowUndoToast(true);
        setRecentlyDeleted(null);
      }
    },
    onError: () => {
      setError('撤销失败，请重试');
    }
  });

  const loading = updateMutation.isPending || deleteMutation.isPending || restoreMutation.isPending;

  // 事件处理函数
  function handleEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setForm({ ...transaction });
  }

  function saveEdit() {
    if (!editingId) return;
    setError('');
    const patch = { ...form, type: 'expense' as const };
    delete (patch as Partial<Transaction> & { id?: string }).id;
    if (patch.amount !== undefined && !(Number(patch.amount) > 0)) {
      setError('金额必须大于 0');
      return;
    }
    updateMutation.mutate({ id: editingId, data: patch });
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

  // 折叠切换函数
  const toggleDate = (date: string) => {
    const newSet = new Set(expandedDates);
    if (newSet.has(date)) {
      newSet.delete(date);
    } else {
      newSet.add(date);
    }
    setExpandedDates(newSet);
  };

  const toggleCategory = (key: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedCategories(newSet);
  };

  const toggleMerchant = (key: string) => {
    const newSet = new Set(expandedMerchants);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedMerchants(newSet);
  };

  // 构建分层数据
  const hierarchicalData = buildHierarchicalData(transactions);
  const sortedDates = Object.keys(hierarchicalData).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <>
      {/* Toast 通知 */}
      {showEditToast && (
        <ProgressToast
          message="账单修改成功！"
          duration={3000}
          onClose={() => setShowEditToast(false)}
        />
      )}
      {showDeleteToast && (
        <ProgressToast
          message="账单删除成功！"
          duration={3000}
          onClose={() => setShowDeleteToast(false)}
        />
      )}
      {showUndoToast && (
        <ProgressToast
          message="账单已恢复！"
          duration={3000}
          onClose={() => setShowUndoToast(false)}
        />
      )}

      <div className={className}>
        {/* 错误提示 */}
        {error && (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertTitle>操作失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* 撤销提示 */}
        {recentlyDeleted && (
          <div className="mb-4">
            <Alert>
              <AlertTitle>删除成功</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>已删除一条记录。</span>
                <button
                  onClick={handleUndo}
                  disabled={loading}
                  className="text-sm underline hover:no-underline disabled:opacity-50"
                >
                  撤销
                </button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* 删除确认对话框 */}
        {confirmRow && (
          <ConfirmDeleteDialog
            transaction={confirmRow}
            onConfirm={confirmDelete}
            onCancel={() => setConfirmRow(null)}
          />
        )}

        {/* 分层树形展示 */}
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <DateGroupRow
              key={date}
              dateData={hierarchicalData[date]}
              date={date}
              isExpanded={expandedDates.has(date)}
              onToggle={() => toggleDate(date)}
              expandedCategories={expandedCategories}
              onToggleCategory={toggleCategory}
              expandedMerchants={expandedMerchants}
              onToggleMerchant={toggleMerchant}
              editingId={editingId}
              form={form}
              setForm={setForm}
              onEdit={handleEdit}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onDelete={handleDelete}
              loading={loading}
              paymentMethods={paymentMethods}
            />
          ))}

          {transactions.length === 0 && (
            <EmptyState
              icon={FileText}
              title="暂无账单记录"
              description="点击下方按钮开始记录您的第一笔支出"
              action={
                <Link
                  href="/add"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  添加账单
                </Link>
              }
            />
          )}
        </div>
      </div>
    </>
  );
}
