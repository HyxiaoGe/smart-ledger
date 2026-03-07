'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useDailyTransactionRowsQuery } from '@/lib/api/hooks';
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
  QuickModalShell,
  QuickSuccessToast,
} from './components';
import { useQuickTransactionCardState } from './useQuickTransactionCardState';
import { useQuickModalNavigation } from './useQuickModalNavigation';

export function QuickTransactionCard({ open, onOpenChange, onSuccess }: QuickTransactionCardProps) {
  const {
    data: todayTransactionsData,
    isLoading: loadingCategories,
    refetch: refetchTodayCategories
  } = useDailyTransactionRowsQuery(
    new Date(),
    {
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

  const { handleClose, handleDetailedEntry } = useQuickModalNavigation({
    onOpenChange,
    detailDelayMs: 300,
  });

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
    <>
      <QuickSuccessToast
        open={showToast}
        message={toastMessage}
        onClose={hideSuccessToast}
      />

      <QuickModalShell open={open} onClose={handleClose}>
        <Card className="border-0 shadow-none bg-transparent">
          <QuickCardHeader onClose={handleClose} />

          <CardContent className="space-y-6 px-6 pb-6 pt-4">
            <StatsCards
              recordedCount={todayItems.size}
              totalCount={QUICK_ITEMS.length}
            />

            <PaymentMethodSelector
              paymentMethods={paymentMethods}
              value={paymentMethod}
              onChange={setPaymentMethod}
            />

            <TipBanner hasRecords={todayItems.size > 0} />

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

            <QuickCardFooter
              onClose={handleClose}
              onDetailedEntry={handleDetailedEntry}
              onRefresh={() => refetchTodayCategories()}
              isLoading={loadingCategories}
            />
          </CardContent>
        </Card>
      </QuickModalShell>
    </>
  );
}
