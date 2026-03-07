'use client';

import React, { useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { formatDateToLocal } from '@/lib/utils/date';
import { useTransactionRowsQuery } from '@/lib/api/hooks';
import type { QuickTransactionCardProps } from './types';
import { QUICK_ITEMS } from './constants';
import { getQuickTransactionStats } from './utils';
import {
  QuickItemRow,
  StatsCards,
  PaymentMethodSelector,
  TipBanner,
  QuickCardHeader,
  QuickCardFooter,
  QuickSuccessToast,
} from './components';
import { useQuickTransactionCardState } from './useQuickTransactionCardState';

export function QuickTransactionCard({ open, onOpenChange, onSuccess }: QuickTransactionCardProps) {
  const router = useRouter();

  // 获取今天的日期字符串
  const getTodayDateString = () => formatDateToLocal(new Date());

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

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleDetailedEntry = useCallback(() => {
    handleClose();
    window.setTimeout(() => {
      router.push('/add');
    }, 300);
  }, [handleClose, router]);

  const {
    createTransaction,
    editingId,
    getCurrentAmount,
    handleAmountChange,
    hideSuccessToast,
    paymentMethod,
    paymentMethods,
    setEditingId,
    setPaymentMethod,
    showToast,
    submitQuickTransaction,
    submittingItemId,
    toastMessage,
  } = useQuickTransactionCardState({
    open,
    onClose: handleClose,
    onSuccess,
    refreshTodayTransactions: () => refetchTodayCategories(),
  });

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <QuickSuccessToast
            open={showToast}
            message={toastMessage}
            onClose={hideSuccessToast}
          />

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
              onClick={handleClose}
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
                <QuickCardHeader onClose={handleClose} />

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
                          currentAmount={getCurrentAmount(item)}
                          onAmountChange={(value) => handleAmountChange(item.id, value)}
                          onStartEdit={() => setEditingId(item.id)}
                          onStopEdit={() => setEditingId(null)}
                          onSubmit={() => submitQuickTransaction(item)}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* 底部区域 */}
                  <QuickCardFooter
                    onClose={handleClose}
                    onDetailedEntry={handleDetailedEntry}
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
