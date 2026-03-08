"use client";
// 交易分组列表组件（客户端支持编辑和删除）
import { EmptyState } from '@/components/EmptyState';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { TransactionGroupedListProps } from './types';
import { useGroupedTransactionListController } from './useGroupedTransactionListController';
import {
  DateGroupRow,
  GroupedListFeedback,
} from './components';

export function TransactionGroupedList({
  initialTransactions,
  className,
  defaultExpandedDates
}: TransactionGroupedListProps) {
  const {
    paymentMethods,
    transactions,
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
    expandedDates,
    expandedCategories,
    expandedMerchants,
    handleEdit,
    saveEdit,
    cancelEdit,
    handleDelete,
    confirmDelete,
    handleUndo,
    closeConfirmDialog,
    toggleDate,
    toggleCategory,
    toggleMerchant,
  } = useGroupedTransactionListController({
    initialTransactions,
    defaultExpandedDates,
  });

  const rowControls = {
    editingId,
    form,
    setForm,
    onEdit: handleEdit,
    onSaveEdit: saveEdit,
    onCancelEdit: cancelEdit,
    onDelete: handleDelete,
    loading,
    paymentMethods,
  };

  return (
    <>
      <div className={className}>
        <GroupedListFeedback
          error={error}
          recentlyDeleted={recentlyDeleted}
          confirmRow={confirmRow}
          loading={loading}
          showEditToast={showEditToast}
          showDeleteToast={showDeleteToast}
          showUndoToast={showUndoToast}
          onCloseEditToast={() => setShowEditToast(false)}
          onCloseDeleteToast={() => setShowDeleteToast(false)}
          onCloseUndoToast={() => setShowUndoToast(false)}
          onUndo={handleUndo}
          onConfirmDelete={confirmDelete}
          onCancelDelete={closeConfirmDialog}
        />

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
              rowControls={rowControls}
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
