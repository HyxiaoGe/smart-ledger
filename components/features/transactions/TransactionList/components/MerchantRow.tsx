'use client';

import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Edit, Store, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { Transaction, MerchantGroup } from '../types';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';
import { EditForm } from './EditForm';
import { TransactionItem } from './TransactionItem';

interface MerchantRowProps {
  merchantData: MerchantGroup;
  merchantKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  editingId: string | null;
  form: Partial<Transaction>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Transaction>>>;
  onEdit: (transaction: Transaction) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (transaction: Transaction) => void;
  loading: boolean;
  paymentMethods: PaymentMethod[];
}

export function MerchantRow({
  merchantData,
  merchantKey,
  isExpanded,
  onToggle,
  editingId,
  form,
  setForm,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  loading,
  paymentMethods,
}: MerchantRowProps) {
  const singleItem = merchantData.items.length === 1;
  const isEditingSingleItem = editingId === merchantData.items[0].id && singleItem;

  if (isEditingSingleItem) {
    // 单笔交易编辑状态
    return (
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-t border-blue-200 dark:border-blue-800">
        <EditForm
          transaction={merchantData.items[0]}
          form={form}
          setForm={setForm}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          loading={loading}
          paymentMethods={paymentMethods}
        />
      </div>
    );
  }

  return (
    <div>
      {/* 商家行 */}
      <div className="w-full p-2 pl-16 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group border-t border-gray-100 dark:border-gray-700">
        <div
          className="flex items-center gap-2 flex-1 cursor-pointer"
          onClick={() => !singleItem && onToggle()}
        >
          {!singleItem && (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-400 dark:text-gray-400" />
            ) : (
              <ChevronUp className="h-3 w-3 text-gray-400 dark:text-gray-400" />
            )
          )}
          {singleItem && <div className="w-3" />}
          <Store className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {merchantData.merchant}
          </span>
          {!singleItem && (
            <span className="text-xs text-gray-400 dark:text-gray-400">
              {merchantData.items.length}笔
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">
            {formatCurrency(merchantData.total, 'CNY')}
          </div>
          {/* 单笔交易：右侧显示编辑/删除图标 */}
          {singleItem && (
            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(merchantData.items[0]);
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
                  onDelete(merchantData.items[0]);
                }}
                disabled={loading}
                className="h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 产品/交易明细层 */}
      {isExpanded && !singleItem && (
        <div className="bg-gray-50 dark:bg-gray-800">
          {merchantData.items.map((item) => (
            <div key={item.id}>
              {editingId === item.id ? (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-t border-blue-200 dark:border-blue-800">
                  <EditForm
                    transaction={item}
                    form={form}
                    setForm={setForm}
                    onSave={onSaveEdit}
                    onCancel={onCancelEdit}
                    loading={loading}
                    paymentMethods={paymentMethods}
                  />
                </div>
              ) : (
                <TransactionItem
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  loading={loading}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
