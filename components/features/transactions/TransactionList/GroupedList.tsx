"use client";
// 交易分组列表组件（客户端支持编辑和删除）
import { TransactionGroupedListProps } from './types';
import { useGroupedTransactionListController } from './useGroupedTransactionListController';
import {
  GroupedListFeedback,
  GroupedTransactionTree,
} from './components';

export function TransactionGroupedList({
  initialTransactions,
  className,
  defaultExpandedDates
}: TransactionGroupedListProps) {
  const {
    paymentMethods,
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

        <GroupedTransactionTree
          hierarchicalData={hierarchicalData}
          sortedDates={sortedDates}
          expandedDates={expandedDates}
          expandedCategories={expandedCategories}
          expandedMerchants={expandedMerchants}
          rowControls={rowControls}
          onToggleDate={toggleDate}
          onToggleCategory={toggleCategory}
          onToggleMerchant={toggleMerchant}
        />
      </div>
    </>
  );
}
