'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDateToLocal } from '@/lib/utils/date';
import { useCreateTransaction, usePaymentMethods, useTransactionRowsQuery } from '@/lib/api/hooks';
import type { QuickTransactionCardProps, QuickTransactionItem } from './types';
import { QUICK_ITEMS } from './constants';
import { getQuickTransactionStats } from './utils';
import {
  QuickItemRow,
  StatsCards,
  PaymentMethodSelector,
  TipBanner,
  QuickCardHeader,
  QuickCardFooter,
} from './components';

export function QuickTransactionCard({ open, onOpenChange, onSuccess }: QuickTransactionCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submittingItemId, setSubmittingItemId] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  // 获取今天的日期字符串
  const getTodayDateString = () => formatDateToLocal(new Date());

  const { data: paymentMethodsData } = usePaymentMethods();
  const paymentMethods = paymentMethodsData || [];
  const createTransaction = useCreateTransaction();

  // 设置默认支付方式
  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethod) {
      const defaultMethod = paymentMethods.find(m => m.is_default);
      if (defaultMethod) {
        setPaymentMethod(defaultMethod.id);
      }
    }
  }, [paymentMethods, paymentMethod]);

  // 使用 React Query 获取今日交易记录
  const {
    data: todayTransactionsData,
    isLoading: loadingCategories,
    refetch: refetchTodayCategories
  } = useTransactionRowsQuery(
    {
      start_date: getTodayDateString(),
      end_date: getTodayDateString(),
      page_size: 100,
    },
    {
      enabled: open,
    }
  );

  // 计算今日已记录的项目
  const todayItems = useMemo(() => {
    return getQuickTransactionStats(todayTransactionsData || []).matchedItems;
  }, [todayTransactionsData]);

  // 处理金额输入
  const handleAmountChange = (itemId: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomAmounts(prev => ({
        ...prev,
        [itemId]: value
      }));
    }
  };

  // 处理快速记账
  const handleQuickTransaction = async (item: QuickTransactionItem) => {
    let finalAmount: number;

    if (item.isFixed) {
      finalAmount = item.fixedAmount!;
    } else {
      const customAmount = customAmounts[item.id];
      if (!customAmount || customAmount.trim() === '') {
        if (item.suggestedAmount && item.suggestedAmount > 0) {
          finalAmount = item.suggestedAmount;
        } else {
          alert('请输入有效金额');
          return;
        }
      } else {
        const parsedAmount = parseFloat(customAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          alert('请输入有效金额');
          return;
        }
        finalAmount = parsedAmount;
      }
    }

    try {
      setSubmittingItemId(item.id);
      await createTransaction.mutateAsync({
        type: 'expense',
        category: item.category,
        amount: finalAmount,
        note: item.title,
        date: getTodayDateString(),
        currency: 'CNY',
        payment_method: paymentMethod || null,
      });

      setLastTransaction(item.title);
      setShowToast(true);
      onSuccess?.();
      refetchTodayCategories();

      if (!item.isFixed) {
        setCustomAmounts(prev => {
          const newAmounts = { ...prev };
          delete newAmounts[item.id];
          return newAmounts;
        });
      }

      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('快速记账失败:', error);
      alert('记账失败，请重试');
    } finally {
      setSubmittingItemId(null);
      setEditingId(null);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {showToast && (
            <ProgressToast
              message={`${lastTransaction} 记账成功！`}
              duration={2000}
              onClose={() => setShowToast(false)}
            />
          )}

          {/* 弹窗背景 */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => onOpenChange(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* 卡片内容 */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <Card className="border-0 shadow-none bg-transparent">
                <QuickCardHeader onClose={() => onOpenChange(false)} />

                <CardContent className="space-y-6 px-6 pb-6 pt-4">
                  {/* 状态统计卡片 */}
                  <StatsCards
                    recordedCount={todayItems.size}
                    totalCount={QUICK_ITEMS.length}
                  />

                  {/* 支付方式选择 */}
                  <PaymentMethodSelector
                    paymentMethods={paymentMethods}
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                  />

                  {/* 提示信息 */}
                  <TipBanner hasRecords={todayItems.size > 0} />

                  {/* 快速记账项目列表 */}
                  <div className="space-y-3">
                    {QUICK_ITEMS.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                      >
                        <QuickItemRow
                          item={item}
                          isRecordedToday={todayItems.has(item.id)}
                          isEditing={editingId === item.id}
                          isSubmitting={
                            createTransaction.isPending && submittingItemId === item.id
                          }
                          currentAmount={customAmounts[item.id] || item.suggestedAmount?.toFixed(2) || ''}
                          onAmountChange={(value) => handleAmountChange(item.id, value)}
                          onStartEdit={() => setEditingId(item.id)}
                          onStopEdit={() => setEditingId(null)}
                          onSubmit={() => handleQuickTransaction(item)}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* 底部区域 */}
                  <QuickCardFooter
                    onClose={() => onOpenChange(false)}
                    onRefresh={() => refetchTodayCategories()}
                    isLoading={loadingCategories}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
