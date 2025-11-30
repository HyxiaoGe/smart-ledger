import { Button } from '@/components/ui/button';
import { Star, Trash2 } from 'lucide-react';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';
import { getPaymentMethodTypeConfig, formatLast4Digits } from '../constants';
import { PaymentIcon } from './PaymentIcon';

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onDelete: () => void;
  onSetDefault: () => void;
}

export function PaymentMethodCard({ method, onDelete, onSetDefault }: PaymentMethodCardProps) {
  const typeConfig = getPaymentMethodTypeConfig(method.type);

  return (
    <div
      className="group relative rounded-xl border-2 border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:border-blue-700 hover:shadow-lg transition-all duration-200"
      style={{
        borderLeftColor: method.color || typeConfig.color,
        borderLeftWidth: '4px',
      }}
    >
      {/* 默认标记 */}
      {method.is_default && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 dark:from-yellow-600 dark:to-amber-700 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
            <Star className="h-3 w-3 fill-white" />
            默认
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* 图标 */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
            style={{
              backgroundColor: `${method.color || typeConfig.color}20`,
            }}
          >
            <PaymentIcon method={method} className="h-7 w-7 flex-shrink-0" />
          </div>

          {/* 名称和类型 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              {method.name}
              {method.last_4_digits && (
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                  {formatLast4Digits(method.last_4_digits)}
                </span>
              )}
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {typeConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* 使用统计 */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">使用次数</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {method.usage_count || 0} 次
          </p>
        </div>
        {method.last_used && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">最后使用</p>
            <p className="text-sm text-gray-700">
              {new Date(method.last_used).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        {!method.is_default && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSetDefault}
            className="flex-1"
          >
            <Star className="h-3 w-3 mr-1" />
            设为默认
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:bg-red-950"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          删除
        </Button>
      </div>
    </div>
  );
}
