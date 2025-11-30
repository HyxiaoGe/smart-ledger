'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/features/input/DateInput';
import { MerchantInput, SubcategorySelect } from '@/components/features/input/MerchantInput';
import { useCategories } from '@/contexts/CategoryContext';
import { formatDateToLocal } from '@/lib/utils/date';
import { Store } from 'lucide-react';
import type { Transaction } from '../types';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';

interface EditFormProps {
  transaction: Transaction;
  form: Partial<Transaction>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Transaction>>>;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  paymentMethods: PaymentMethod[];
}

export function EditForm({
  transaction,
  form,
  setForm,
  onSave,
  onCancel,
  loading,
  paymentMethods,
}: EditFormProps) {
  const { categories } = useCategories();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">日期</label>
          <DateInput
            selected={new Date((form.date as string) || transaction.date)}
            onSelect={(date) => setForm((f) => ({ ...f, date: date ? formatDateToLocal(date) : undefined }))}
            placeholder="选择日期"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">类型</label>
          <div className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 text-sm flex items-center text-red-600 dark:text-red-400">
            支出
          </div>
          <input type="hidden" name="type" value="expense" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">分类</label>
          <select
            className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
            value={(form.category as string) || transaction.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.icon ? `${c.icon} ` : ''}{c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">金额</label>
          <Input
            type="number"
            inputMode="decimal"
            value={String(form.amount ?? transaction.amount ?? '')}
            onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            className="h-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">币种</label>
          <select
            className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
            value={form.currency as string || transaction.currency || 'CNY'}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
          >
            <option value="CNY">CNY</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">支付方式</label>
          <select
            className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
            value={form.payment_method as string || transaction.payment_method || ''}
            onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
          >
            <option value="">未设置</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}{pm.is_default ? ' (默认)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">备注</label>
          <Input
            value={(form.note as string) || transaction.note || ''}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="请输入备注信息"
            className="h-10"
          />
        </div>
      </div>

      {/* 商家信息编辑区域 */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Store className="h-4 w-4" />
          <span className="font-medium">商家信息</span>
          <span className="text-xs text-gray-400 dark:text-gray-400">（可选）</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">商家/品牌</label>
            <MerchantInput
              value={(form.merchant as string) ?? transaction.merchant ?? ''}
              onChange={(value) => setForm((f) => ({ ...f, merchant: value }))}
              placeholder="如：瑞幸咖啡、地铁"
              category={(form.category as string) || transaction.category}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">子分类</label>
            <SubcategorySelect
              category={(form.category as string) || transaction.category}
              value={(form.subcategory as string) ?? transaction.subcategory ?? ''}
              onChange={(value) => setForm((f) => ({ ...f, subcategory: value }))}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">具体产品/服务</label>
          <Input
            value={(form.product as string) ?? transaction.product ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
            placeholder="如：生椰拿铁、地铁票"
            className="h-10"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          className="min-w-[80px]"
        >
          取消
        </Button>
        <Button
          onClick={onSave}
          disabled={loading}
          className="min-w-[80px] bg-blue-600 hover:bg-blue-700"
        >
          {loading ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}
