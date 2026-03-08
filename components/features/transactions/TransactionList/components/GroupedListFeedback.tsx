'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProgressToast } from '@/components/shared/ProgressToast';
import type { Transaction } from '../types';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface GroupedListFeedbackProps {
  error: string;
  recentlyDeleted: Transaction | null;
  confirmRow: Transaction | null;
  loading: boolean;
  showEditToast: boolean;
  showDeleteToast: boolean;
  showUndoToast: boolean;
  onCloseEditToast: () => void;
  onCloseDeleteToast: () => void;
  onCloseUndoToast: () => void;
  onUndo: () => void;
  onConfirmDelete: (transaction: Transaction) => void;
  onCancelDelete: () => void;
}

export function GroupedListFeedback({
  error,
  recentlyDeleted,
  confirmRow,
  loading,
  showEditToast,
  showDeleteToast,
  showUndoToast,
  onCloseEditToast,
  onCloseDeleteToast,
  onCloseUndoToast,
  onUndo,
  onConfirmDelete,
  onCancelDelete,
}: GroupedListFeedbackProps) {
  return (
    <>
      {showEditToast && (
        <ProgressToast
          message="账单修改成功！"
          duration={3000}
          onClose={onCloseEditToast}
        />
      )}
      {showDeleteToast && (
        <ProgressToast
          message="账单删除成功！"
          duration={3000}
          onClose={onCloseDeleteToast}
        />
      )}
      {showUndoToast && (
        <ProgressToast
          message="账单已恢复！"
          duration={3000}
          onClose={onCloseUndoToast}
        />
      )}

      {error && (
        <div className="mb-4">
          <Alert variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {recentlyDeleted && (
        <div className="mb-4">
          <Alert>
            <AlertTitle>删除成功</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>已删除一条记录。</span>
              <button
                onClick={onUndo}
                disabled={loading}
                className="text-sm underline hover:no-underline disabled:opacity-50"
              >
                撤销
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {confirmRow && (
        <ConfirmDeleteDialog
          transaction={confirmRow}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      )}
    </>
  );
}
