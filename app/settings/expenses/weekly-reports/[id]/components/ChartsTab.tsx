import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { BarChart3, CreditCard, Store, FileText } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency, getCategoryName, getPaymentMethodName, CATEGORY_COLORS, PAYMENT_COLORS } from '../utils';
import type { WeeklyReport } from '@/lib/api/services/weekly-reports';

interface ChartsTabProps {
  report: WeeklyReport;
}

// 分类饼图组件
function CategoryPieChart({ categoryBreakdown }: { categoryBreakdown: WeeklyReport['category_breakdown'] }) {
  if (categoryBreakdown.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>暂无分类数据</p>
      </div>
    );
  }

  const data = categoryBreakdown.map(cat => ({
    name: getCategoryName(cat.category),
    value: Number(cat.amount),
    percentage: cat.percentage
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `¥${formatCurrency(value)}`}
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 支付方式环形图组件
function PaymentMethodPieChart({ paymentMethodStats }: { paymentMethodStats: WeeklyReport['payment_method_stats'] }) {
  if (paymentMethodStats.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>暂无支付方式数据</p>
      </div>
    );
  }

  const data = paymentMethodStats.map(method => ({
    name: getPaymentMethodName(method.method),
    value: Number(method.amount),
    percentage: method.percentage
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
          innerRadius={60}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `¥${formatCurrency(value)}`}
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 商家柱状图组件
function MerchantBarChart({ topMerchants }: { topMerchants: WeeklyReport['top_merchants'] }) {
  if (topMerchants.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>暂无商户数据</p>
      </div>
    );
  }

  const data = topMerchants.slice(0, 5).map((merchant, index) => ({
    name: merchant.merchant,
    amount: Number(merchant.amount),
    count: merchant.count,
    rank: index + 1
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          type="number"
          tickFormatter={(value) => `¥${(value / 1000).toFixed(1)}k`}
          tick={{ fill: 'currentColor' }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fill: 'currentColor' }}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'amount') {
              return [`¥${formatCurrency(value)}`, '消费金额'];
            }
            return [value, '消费笔数'];
          }}
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Bar dataKey="amount" fill="#9333ea" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ChartsTab({ report }: ChartsTabProps) {
  return (
    <TabsContent value="charts">
      <div className="space-y-8">
        {/* 上半部分：饼图 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 类别分布饼图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                消费类别分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryPieChart categoryBreakdown={report.category_breakdown} />
            </CardContent>
          </Card>

          {/* 支付方式环形图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                支付方式分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethodPieChart paymentMethodStats={report.payment_method_stats} />
            </CardContent>
          </Card>
        </div>

        {/* 下半部分：商家横向柱状图 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-purple-500" />
              TOP 5 消费商户
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MerchantBarChart topMerchants={report.top_merchants} />
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
