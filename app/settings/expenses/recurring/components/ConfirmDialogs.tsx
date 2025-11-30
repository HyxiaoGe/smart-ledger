'use client';

import { Button } from '@/components/ui/button';
import type { RecurringExpense } from '@/lib/api/services/recurring-expenses';

interface PauseConfirmDialogProps {
  expense: RecurringExpense;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PauseConfirmDialog({ expense, onConfirm, onCancel }: PauseConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">确认暂停</h3>
        </div>
        <div className="p-4">
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            确定要暂停固定支出 "{expense.name}" 吗？
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            暂停后将停止自动生成该支出记录，您可以随时重新启用。
          </p>
          {expense.next_generate && (
            <p className="text-sm text-blue-600 mt-2">
              下次生成时间：{expense.next_generate}
            </p>
          )}
        </div>
        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button variant="default" onClick={onConfirm}>
            确认暂停
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmDialogProps {
  expense: RecurringExpense;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ expense, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">确认删除</h3>
        </div>
        <div className="p-4">
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            确定要删除固定支出 "{expense.name}" 吗？
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            删除后将停止生成该支出记录，此操作不可撤销。
          </p>
        </div>
        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
