import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Star, TrendingUp } from 'lucide-react';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';

interface StatsCardsProps {
  paymentMethods: PaymentMethod[];
}

export function StatsCards({ paymentMethods }: StatsCardsProps) {
  const stats = {
    total: paymentMethods.length,
    default: paymentMethods.find((pm) => pm.is_default)?.name || '未设置',
    mostUsed: paymentMethods.reduce(
      (max, pm) => (pm.usage_count! > (max?.usage_count || 0) ? pm : max),
      null as PaymentMethod | null
    ),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">支付方式总数</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">默认支付方式</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {stats.default}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">最常使用</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {stats.mostUsed?.name || '暂无数据'}
              </p>
              {stats.mostUsed && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  使用 {stats.mostUsed.usage_count} 次
                </p>
              )}
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
