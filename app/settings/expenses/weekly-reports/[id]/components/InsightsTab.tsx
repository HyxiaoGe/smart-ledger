import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import {
  Sparkles,
  ShoppingBag,
  BarChart3,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatPercentage, getCategoryName, getPaymentMethodName } from '../utils';
import type { WeeklyReport } from '@/lib/api/services/weekly-reports';

interface InsightsTabProps {
  report: WeeklyReport;
}

// AI 洞察组件
function AIInsightsCard({ aiInsights }: { aiInsights: string | null }) {
  if (!aiInsights) return null;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <CardTitle className="text-purple-900 dark:text-purple-100">AI 智能洞察</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
          {aiInsights}
        </p>
      </CardContent>
    </Card>
  );
}

// 关键发现组件
function KeyFindings({ report }: { report: WeeklyReport }) {
  const maxTransaction = report.category_breakdown.reduce(
    (max, cat) => (cat.amount > (max?.amount || 0) ? cat : max),
    report.category_breakdown[0]
  );

  const maxCategoryPercent = report.category_breakdown.length > 0
    ? Math.max(...report.category_breakdown.map(c => c.percentage))
    : 0;
  const isConcentrated = maxCategoryPercent > 50;

  const mostUsedMethod = report.payment_method_stats.length > 0
    ? report.payment_method_stats.reduce(
        (max, method) => (method.count > (max?.count || 0) ? method : max),
        report.payment_method_stats[0]
      )
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 最大单笔消费 */}
      {maxTransaction && (
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-red-600 dark:text-red-400" />
              <CardTitle className="text-sm">最大支出类别</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                ¥{formatCurrency(maxTransaction.amount)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {getCategoryName(maxTransaction.category)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                占比 {maxTransaction.percentage.toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 消费集中度 */}
      <Card className={`bg-gradient-to-br ${
        isConcentrated
          ? 'from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 border-yellow-200 dark:border-yellow-800'
          : 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className={`h-5 w-5 ${
              isConcentrated
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-green-600 dark:text-green-400'
            }`} />
            <CardTitle className="text-sm">消费集中度</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className={`text-2xl font-bold ${
              isConcentrated
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {maxCategoryPercent.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {isConcentrated ? '较为集中' : '分布均衡'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {isConcentrated ? '建议分散消费' : '消费结构健康'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 支付习惯 */}
      {mostUsedMethod && (
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-sm">常用支付方式</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {mostUsedMethod.count} 笔
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {getPaymentMethodName(mostUsedMethod.method)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                占比 {mostUsedMethod.percentage.toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 消费行为分析组件
function BehaviorAnalysis({ report }: { report: WeeklyReport }) {
  const avgTransaction = report.average_transaction ?? 0;
  const frequencyLabel = report.transaction_count < 5 ? '偏少' : report.transaction_count > 20 ? '较多' : '正常';
  const amountLabel = avgTransaction < 20 ? '小额为主' : avgTransaction > 100 ? '大额为主' : '中等金额';
  const frequentMerchants = report.top_merchants.filter(m => m.count >= 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-500" />
          消费行为分析
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">交易频次</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">平均每天</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {(report.transaction_count / 7).toFixed(1)} 笔
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{frequencyLabel}</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">单笔均额</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">平均每笔消费</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                ¥{formatCurrency(avgTransaction)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{amountLabel}</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">高频商家</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">消费超过 2 次</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {frequentMerchants.length} 家
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {frequentMerchants.length > 0
                  ? frequentMerchants.slice(0, 2).map(m => m.merchant).join('、')
                  : '无'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 环比对比分析组件
function WeekComparison({ report }: { report: WeeklyReport }) {
  const percentage = report.week_over_week_percentage;
  const isIncrease = percentage > 0;
  const volatilityLabel = Math.abs(percentage) < 10 ? '变化平稳' : Math.abs(percentage) < 30 ? '有所波动' : '波动较大';
  const TrendIcon = isIncrease ? TrendingUp : TrendingDown;
  const trendColor = isIncrease ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';

  const getHealthComment = () => {
    if (percentage > 30) return '本周消费增长较快，建议关注支出是否合理。';
    if (percentage > 0 && percentage <= 30) return '本周消费略有增长，整体在可控范围内。';
    if (percentage < 0 && percentage >= -30) return '本周消费有所下降，保持良好消费习惯。';
    return '本周消费大幅下降，支出控制效果显著。';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendIcon className={`h-5 w-5 ${trendColor}`} />
          环比对比分析
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">总体趋势</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">较上周</p>
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold ${
                isIncrease ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {formatPercentage(percentage)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{volatilityLabel}</p>
            </div>
          </div>

          <div className="py-3">
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">健康度评价</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{getHealthComment()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 智能建议组件
function SmartSuggestions({ report }: { report: WeeklyReport }) {
  const suggestions: string[] = [];

  // 基于类别分布
  const maxCategoryPercent = report.category_breakdown.length > 0
    ? Math.max(...report.category_breakdown.map(c => c.percentage))
    : 0;
  if (maxCategoryPercent > 50) {
    suggestions.push('您的消费过于集中在单一类别，建议适当分散消费，保持支出均衡。');
  }

  // 基于环比变化
  if (report.week_over_week_percentage > 30) {
    suggestions.push('本周支出环比增长超过 30%，建议检查是否有大额非必要支出。');
  }

  // 基于交易频次
  if (report.transaction_count < 5) {
    suggestions.push('记账频次较低，建议提高记账积极性，完整记录每日消费。');
  }

  // 基于单笔均额
  const avgTrans = report.average_transaction ?? 0;
  if (avgTrans > 0 && avgTrans < 10) {
    suggestions.push('单笔消费金额偏低，可考虑合并小额支出记录，提升记账效率。');
  }

  // 基于高频商家
  const frequentMerchants = report.top_merchants.filter(m => m.count >= 3);
  if (frequentMerchants.length > 0) {
    suggestions.push(`您经常在 ${frequentMerchants[0].merchant} 消费，可以考虑办理会员卡获得优惠。`);
  }

  // 如果没有任何建议
  if (suggestions.length === 0) {
    suggestions.push('您的消费习惯良好，保持当前的消费模式即可。');
    suggestions.push('建议继续保持记账习惯，定期回顾消费情况。');
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 border-green-200 dark:border-green-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
          <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />
          智能建议
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-3 text-gray-700 dark:text-gray-200">
              <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function InsightsTab({ report }: InsightsTabProps) {
  return (
    <TabsContent value="insights">
      <div className="space-y-8">
        <AIInsightsCard aiInsights={report.ai_insights} />
        <KeyFindings report={report} />
        <BehaviorAnalysis report={report} />
        <WeekComparison report={report} />
        <SmartSuggestions report={report} />
      </div>
    </TabsContent>
  );
}
