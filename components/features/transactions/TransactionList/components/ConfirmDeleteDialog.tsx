'use client';

import { Button } from '@/components/ui/button';
import type { Transaction } from '../types';

interface ConfirmDeleteDialogProps {
  transaction: Transaction;
  onConfirm: (transaction: Transaction) => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({
  transaction,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm w-full max-w-sm z-50"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-semibold">
          确认删除
        </div>
        <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
          确定要删除这条记录吗？删除后可在短时间内"撤销"。
        </div>
        <div className="p-4 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(transaction)}
          >
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
