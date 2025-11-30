'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { Transaction, DateGroup } from '../types';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';
import { CategoryGroupRow } from './CategoryGroupRow';

interface DateGroupRowProps {
  dateData: DateGroup;
  date: string;
  isExpanded: boolean;
  onToggle: () => void;
  expandedCategories: Set<string>;
  onToggleCategory: (key: string) => void;
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

export function DateGroupRow({
  dateData,
  date,
  isExpanded,
  onToggle,
  expandedCategories,
  onToggleCategory,
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
}: DateGroupRowProps) {
  // 计算总笔数
  const totalItems = Object.values(dateData.categories).reduce(
    (sum, cat) =>
      sum + Object.values(cat.merchants).reduce((s, m) => s + m.items.length, 0),
    0
  );

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* 日期层 */}
      <button
        onClick={onToggle}
        className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            共 {totalItems} 笔
          </span>
        </div>
        <div className="font-semibold text-red-600 dark:text-red-400">
          -{formatCurrency(dateData.total, 'CNY')}
        </div>
      </button>

      {/* 分类层 */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-900">
          {Object.values(dateData.categories)
            .sort((a, b) => b.total - a.total)
            .map((categoryData) => {
              const categoryKey = `${date}-${categoryData.category}`;
              const isCategoryExpanded = expandedCategories.has(categoryKey);

              return (
                <CategoryGroupRow
                  key={categoryKey}
                  categoryData={categoryData}
                  categoryKey={categoryKey}
                  date={date}
                  isExpanded={isCategoryExpanded}
                  onToggle={() => onToggleCategory(categoryKey)}
                  expandedMerchants={expandedMerchants}
                  onToggleMerchant={onToggleMerchant}
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
