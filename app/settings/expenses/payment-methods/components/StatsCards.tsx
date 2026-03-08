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
      <Card className="overflow-hidden border border-slate-200/70 bg-gradient-to-br from-white via-sky-50 to-blue-50 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:from-slate-900 dark:via-sky-950/40 dark:to-blue-950/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">支付方式总数</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-white/80 p-3 shadow-sm dark:border-blue-800 dark:bg-slate-900/70">
              <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-300" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 bg-gradient-to-br from-white via-amber-50 to-yellow-50 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:from-slate-900 dark:via-amber-950/40 dark:to-yellow-950/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">默认支付方式</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {stats.default}
              </p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-white/80 p-3 shadow-sm dark:border-yellow-800 dark:bg-slate-900/70">
              <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-300" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 bg-gradient-to-br from-white via-emerald-50 to-green-50 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:from-slate-900 dark:via-emerald-950/40 dark:to-green-950/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">最常使用</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {stats.mostUsed?.name || '暂无数据'}
              </p>
              {stats.mostUsed && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  使用 {stats.mostUsed.usage_count} 次
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-green-200 bg-white/80 p-3 shadow-sm dark:border-green-800 dark:bg-slate-900/70">
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-300" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
