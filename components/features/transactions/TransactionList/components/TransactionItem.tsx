'use client';

import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { Transaction } from '../types';

interface TransactionItemProps {
  item: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  loading: boolean;
}

export function TransactionItem({
  item,
  onEdit,
  onDelete,
  loading,
}: TransactionItemProps) {
  return (
    <div className="p-2 pl-24 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group border-t border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
        <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600" />
        <span>{item.product || item.note || '无备注'}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
          {formatCurrency(Number(item.amount || 0), 'CNY')}
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            disabled={loading}
            className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            disabled={loading}
            className="h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
