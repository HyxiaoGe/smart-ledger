import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { FileText } from 'lucide-react';
import { formatCurrency, getPaymentMethodName } from '../utils';
import type { WeeklyReport } from '@/lib/api/services/weekly-reports';

interface MerchantsTabProps {
  report: WeeklyReport;
}

// 商家排行榜组件
function MerchantRanking({ topMerchants }: { topMerchants: WeeklyReport['top_merchants'] }) {
  if (topMerchants.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>暂无商户数据</p>
      </div>
    );
  }

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 1:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 2:
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  return (
    <div className="space-y-4">
      {topMerchants.slice(0, 5).map((merchant, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(index)}`}>
              {index + 1}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {merchant.merchant}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {merchant.count} 笔消费
              </p>
            </div>
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            ¥{formatCurrency(merchant.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

// 支付方式统计组件
function PaymentMethodStats({ paymentMethodStats }: { paymentMethodStats: WeeklyReport['payment_method_stats'] }) {
  if (paymentMethodStats.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>暂无支付方式数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paymentMethodStats.map((method, index) => (
        <div key={index}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {getPaymentMethodName(method.method)}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {method.count} 笔
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                ¥{formatCurrency(method.amount)}
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400 w-12 text-right">
                {method.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${method.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MerchantsTab({ report }: MerchantsTabProps) {
  return (
    <TabsContent value="merchants">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* TOP 5 商户 */}
        <Card>
          <CardHeader>
            <CardTitle>TOP 5 消费商户</CardTitle>
          </CardHeader>
          <CardContent>
            <MerchantRanking topMerchants={report.top_merchants} />
          </CardContent>
        </Card>

        {/* 支付方式统计 */}
        <Card>
          <CardHeader>
            <CardTitle>支付方式统计</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentMethodStats paymentMethodStats={report.payment_method_stats} />
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
