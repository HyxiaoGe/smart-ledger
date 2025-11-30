'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';
import { paymentMethodsApi } from '@/lib/api/services/payment-methods';
import { formatLast4Digits } from '../constants';

interface DeletePaymentMethodDialogProps {
  method: PaymentMethod;
  allMethods: PaymentMethod[];
  onClose: () => void;
  onSuccess: () => void;
  setToastMessage: (msg: string) => void;
  setShowToast: (show: boolean) => void;
}

export function DeletePaymentMethodDialog({
  method,
  allMethods,
  onClose,
  onSuccess,
  setToastMessage,
  setShowToast,
}: DeletePaymentMethodDialogProps) {
  const [migrateToId, setMigrateToId] = useState('');
  const [deleting, setDeleting] = useState(false);

  const hasUsage = (method.usage_count || 0) > 0;
  const availableMethods = allMethods.filter((pm) => pm.id !== method.id);

  const handleDelete = async () => {
    if (hasUsage && !migrateToId) {
      setToastMessage('❌ 请选择要迁移到的支付方式');
      setShowToast(true);
      return;
    }

    try {
      setDeleting(true);
      const result = await paymentMethodsApi.delete(
        method.id,
        migrateToId || undefined
      );

      if (result.success) {
        onSuccess();
      } else {
        setToastMessage(`❌ ${result.message}`);
        setShowToast(true);
      }
    } catch (error) {
      console.error('删除支付方式失败:', error);
      setToastMessage('❌ 删除支付方式失败，请重试');
      setShowToast(true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            删除支付方式
          </h3>

          <div className="mb-6">
            <p className="text-gray-700 mb-2">
              确定要删除支付方式「{method.name}」吗？
            </p>

            {hasUsage && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500 rounded">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  ⚠️ 该支付方式有 {method.usage_count} 笔交易记录
                </p>
                <p className="text-sm text-yellow-700 mb-4">
                  删除前需要将这些交易记录迁移到其他支付方式，以保证数据完整性
                </p>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  迁移到 <span className="text-red-500">*</span>
                </label>
                <select
                  value={migrateToId}
                  onChange={(e) => setMigrateToId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
                >
                  <option value="">-- 请选择目标支付方式 --</option>
                  {availableMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.icon} {pm.name}
                      {pm.last_4_digits && ` (${formatLast4Digits(pm.last_4_digits)})`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={deleting}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
