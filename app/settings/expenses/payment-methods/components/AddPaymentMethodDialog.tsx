'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';
import { paymentMethodsApi } from '@/lib/api/services/payment-methods';
import { PAYMENT_METHOD_TYPES, PAYMENT_ICONS, PAYMENT_COLORS } from '../constants';
import { TypeIcon } from './PaymentIcon';

interface AddPaymentMethodDialogProps {
  onClose: () => void;
  onSuccess: () => void;
  setToastMessage: (msg: string) => void;
  setShowToast: (show: boolean) => void;
}

export function AddPaymentMethodDialog({
  onClose,
  onSuccess,
  setToastMessage,
  setShowToast,
}: AddPaymentMethodDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentMethod['type']>('other');
  const [icon, setIcon] = useState('📱');
  const [color, setColor] = useState(PAYMENT_COLORS[0]);
  const [last4Digits, setLast4Digits] = useState('');
  const [saving, setSaving] = useState(false);

  const isCardType = type === 'credit_card' || type === 'debit_card';

  const handleSubmit = async () => {
    if (!name.trim()) {
      setToastMessage('❌ 请输入支付方式名称');
      setShowToast(true);
      return;
    }

    if (isCardType && last4Digits && !/^\d{4}$/.test(last4Digits)) {
      setToastMessage('❌ 卡号后四位必须是4位数字');
      setShowToast(true);
      return;
    }

    try {
      setSaving(true);
      await paymentMethodsApi.create({
        name: name.trim(),
        type,
        icon,
        color,
        last4Digits: isCardType && last4Digits ? last4Digits : undefined,
      });
      onSuccess();
    } catch (error) {
      console.error('添加支付方式失败:', error);
      setToastMessage('❌ 添加支付方式失败，请重试');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            添加支付方式
          </h3>

          {/* 支付方式类型 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支付方式类型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_METHOD_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setType(t.value as PaymentMethod['type']);
                    setIcon(t.icon);
                    setColor(t.color);
                  }}
                  className={`p-3 border-2 rounded-lg text-center transition-all flex flex-col items-center justify-center ${
                    type === t.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center mb-2 h-8 w-8">
                    <TypeIcon type={t.value as PaymentMethod['type']} className="h-8 w-8" />
                  </div>
                  <div className="text-xs font-medium">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 支付方式名称 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支付方式名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：招商银行信用卡"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* 卡号后四位（仅卡类型显示） */}
          {isCardType && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                卡号后四位（可选）
              </label>
              <input
                type="text"
                value={last4Digits}
                onChange={(e) =>
                  setLast4Digits(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="例如：1234"
                maxLength={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          )}

          {/* 图标选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择图标
            </label>
            <div className="grid grid-cols-10 gap-2">
              {PAYMENT_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`p-2 text-2xl border-2 rounded-lg hover:scale-110 transition-transform ${
                    icon === ic ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* 颜色选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择颜色
            </label>
            <div className="grid grid-cols-6 gap-3">
              {PAYMENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    color === c
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-200 dark:border-gray-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* 预览 */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-3">预览效果</p>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${color}20` }}
              >
                {icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {name || '支付方式名称'}
                  {isCardType && last4Digits && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      **** {last4Digits}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {PAYMENT_METHOD_TYPES.find((t) => t.value === type)?.label}
                </p>
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1"
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? '添加中...' : '添加支付方式'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
