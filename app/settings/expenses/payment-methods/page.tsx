'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentMethodsApi, PaymentMethod } from '@/lib/api/services/payment-methods';

import {
  StatsCards,
  PaymentMethodCard,
  AddPaymentMethodDialog,
  DeletePaymentMethodDialog,
} from './components';

// 加载骨架屏组件
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮骨架 */}
        <div className="mb-6">
          <Skeleton className="h-10 w-32" />
        </div>

        {/* 标题骨架 */}
        <div className="mb-8">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* 统计卡片骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 支付方式列表骨架 */}
        <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 空状态组件
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
        <CreditCard className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        还没有支付方式
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        您常用的支付方式会在这里显示
      </p>
    </div>
  );
}

export default function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 使用 React Query 获取支付方式
  const { data: paymentMethodsData, isLoading: loading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
  });

  const paymentMethods = paymentMethodsData || [];

  // 设置默认支付方式 mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => paymentMethodsApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      setToastMessage('✅ 默认支付方式设置成功！');
      setShowToast(true);
    },
    onError: () => {
      setToastMessage('❌ 设置默认支付方式失败，请重试');
      setShowToast(true);
    },
  });

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses">
            <Button
              variant="ghost"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 rounded-lg px-3 py-2"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回消费配置
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-blue-600" />
            支付方式管理
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            管理您的支付账户，让记账更加便捷准确
          </p>
        </div>

        {/* 统计卡片 */}
        <StatsCards paymentMethods={paymentMethods} />

        {/* 支付方式列表 */}
        <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">我的支付方式</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    onDelete={() => setDeletingMethod(method)}
                    onSetDefault={() => handleSetDefault(method.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用提示 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            💡 提示：设置默认支付方式后，添加账单时会自动选择该支付方式
          </p>
        </div>
      </div>

      {/* 添加支付方式对话框 */}
      {showAddDialog && (
        <AddPaymentMethodDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            setToastMessage('✅ 支付方式添加成功！');
            setShowToast(true);
          }}
          setToastMessage={setToastMessage}
          setShowToast={setShowToast}
        />
      )}

      {/* 删除支付方式对话框 */}
      {deletingMethod && (
        <DeletePaymentMethodDialog
          method={deletingMethod}
          allMethods={paymentMethods}
          onClose={() => setDeletingMethod(null)}
          onSuccess={() => {
            setDeletingMethod(null);
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            setToastMessage('✅ 支付方式删除成功！');
            setShowToast(true);
          }}
          setToastMessage={setToastMessage}
          setShowToast={setShowToast}
        />
      )}

      {/* Toast 提示 */}
      {showToast && (
        <ProgressToast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
