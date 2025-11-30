'use client';

import { motion } from 'framer-motion';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';

interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethod[];
  value: string;
  onChange: (value: string) => void;
}

export function PaymentMethodSelector({
  paymentMethods,
  value,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <motion.div
      className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-100 dark:border-green-800"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <div className="flex items-center gap-2 flex-1">
        <label className="text-sm font-medium text-green-700 dark:text-green-300">
          支付方式：
        </label>
        <select
          className="flex-1 h-9 rounded-md border border-green-200 dark:border-green-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 text-sm focus:border-green-500 focus:ring-green-500 transition-all duration-200 ease-in-out hover:border-green-400 dark:hover:border-green-500 hover:shadow-sm cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">未设置</option>
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.id}>
              {pm.name}{pm.is_default ? ' (默认)' : ''}
            </option>
          ))}
        </select>
      </div>
    </motion.div>
  );
}
