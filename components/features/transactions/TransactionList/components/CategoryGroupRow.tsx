'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { CategoryChip } from '@/components/CategoryChip';
import { formatCurrency } from '@/lib/utils/format';
import type { Transaction, CategoryGroup } from '../types';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';
import { MerchantRow } from './MerchantRow';

interface CategoryGroupRowProps {
  categoryData: CategoryGroup;
  categoryKey: string;
  date: string;
  isExpanded: boolean;
  onToggle: () => void;
  expandedMerchants: Set<string>;
  onToggleMerchant: (key: string) => void;
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

export function CategoryGroupRow({
  categoryData,
  categoryKey,
  date,
  isExpanded,
  onToggle,
  expandedMerchants,
  onToggleMerchant,
  editingId,
  form,
  setForm,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  loading,
  paymentMethods,
}: CategoryGroupRowProps) {
  return (
    <div className="border-t border-gray-100 dark:border-gray-700">
      <button
        onClick={onToggle}
        className="w-full p-3 pl-8 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-gray-400 dark:text-gray-400" />
          ) : (
            <ChevronUp className="h-3 w-3 text-gray-400 dark:text-gray-400" />
          )}
          <CategoryChip category={categoryData.category} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {Object.keys(categoryData.merchants).length}个商家
          </span>
        </div>
        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {formatCurrency(categoryData.total, 'CNY')}
        </div>
      </button>

      {/* 商家层 */}
      {isExpanded && (
        <div>
          {Object.values(categoryData.merchants)
            .sort((a, b) => b.total - a.total)
            .map((merchantData) => {
              const merchantKey = `${categoryKey}-${merchantData.merchant}`;
              const isMerchantExpanded = expandedMerchants.has(merchantKey);

              return (
                <MerchantRow
                  key={merchantKey}
                  merchantData={merchantData}
                  merchantKey={merchantKey}
                  isExpanded={isMerchantExpanded}
                  onToggle={() => onToggleMerchant(merchantKey)}
                  editingId={editingId}
                  form={form}
                  setForm={setForm}
                  onEdit={onEdit}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onDelete={onDelete}
                  loading={loading}
                  paymentMethods={paymentMethods}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
