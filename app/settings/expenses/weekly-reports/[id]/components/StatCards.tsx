import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils';

interface StatCardsProps {
  totalExpenses: number;
  averageTransaction: number;
  transactionCount: number;
  weekOverWeekPercentage: number;
  weekOverWeekChange: number;
}

export function StatCards({
  totalExpenses,
  averageTransaction,
  transactionCount,
  weekOverWeekPercentage,
  weekOverWeekChange,
}: StatCardsProps) {
  const isIncrease = weekOverWeekPercentage > 0;
  const changeAmount = Math.abs(weekOverWeekChange);

  const trendCardClass = isIncrease
    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900';

  const trendTitleClass = isIncrease
    ? 'text-red-700 dark:text-red-300'
    : 'text-green-700 dark:text-green-300';

  const trendValueClass = isIncrease
    ? 'text-red-600 dark:text-red-400'
    : 'text-green-600 dark:text-green-400';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* 总支出 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              总支出
            </CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ¥{formatCurrency(totalExpenses)}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            平均每笔 ¥{formatCurrency(averageTransaction)}
          </p>
        </CardContent>
      </Card>

      {/* 交易笔数 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              交易笔数
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {transactionCount}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            本周累计消费记录
          </p>
        </CardContent>
      </Card>

      {/* 较上周百分比 */}
      <Card className={trendCardClass}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-sm font-medium ${trendTitleClass}`}>
              较上周
            </CardTitle>
            {isIncrease ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </div>
          <div className={`text-2xl font-bold ${trendValueClass}`}>
            {formatPercentage(weekOverWeekPercentage)}
          </div>
        </CardHeader>
        <CardContent>
          <p className={`text-xs ${trendValueClass}`}>
            消费增减百分比
          </p>
        </CardContent>
      </Card>

      {/* 增减金额 */}
      <Card className={trendCardClass}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-sm font-medium ${trendTitleClass}`}>
              增减金额
            </CardTitle>
            {isIncrease ? (
              <ArrowUpCircle className="h-4 w-4 text-red-500" />
            ) : (
              <ArrowDownCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
          <div className={`text-2xl font-bold ${trendValueClass}`}>
            {isIncrease ? '+' : '-'}¥{formatCurrency(changeAmount)}
          </div>
        </CardHeader>
        <CardContent>
          <p className={`text-xs ${trendValueClass}`}>
            省下 / 多花了多少钱
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
