import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Sparkles, FileText } from 'lucide-react';
import { formatCurrency, formatPercentage, getCategoryName } from '../utils';
import type { WeeklyReport } from '@/lib/api/services/weekly-reports';

interface OverviewTabProps {
  report: WeeklyReport;
}

// 健康度评分组件
function HealthScoreCard({ report }: { report: WeeklyReport }) {
  // 计算健康度分数
  let score = 100;
  const reasons: string[] = [];

  // 1. 消费稳定性（40分）- 波动过大扣分
  const changePercent = Math.abs(report.week_over_week_percentage);
  if (changePercent > 50) {
    score -= 40;
    reasons.push(`消费波动较大 (${formatPercentage(changePercent)})`);
  } else if (changePercent > 30) {
    score -= 20;
    reasons.push(`消费有所波动 (${formatPercentage(changePercent)})`);
  } else if (changePercent > 15) {
    score -= 10;
  }

  // 2. 类别分布合理性（30分）- 过于集中扣分
  if (report.category_breakdown.length > 0) {
    const maxCategoryPercent = Math.max(...report.category_breakdown.map(c => c.percentage));
    if (maxCategoryPercent > 70) {
      score -= 30;
      reasons.push('消费过于集中在单一类别');
    } else if (maxCategoryPercent > 50) {
      score -= 15;
      reasons.push('建议分散消费类别');
    }
  }

  // 3. 交易频率合理性（30分）- 过少或过多扣分
  const avgPerTransaction = report.average_transaction ?? 0;
  if (report.transaction_count < 5) {
    score -= 20;
    reasons.push('交易笔数较少，建议增加记账频率');
  } else if (avgPerTransaction > 0 && avgPerTransaction < 10) {
    score -= 10;
    reasons.push('平均每笔金额偏低');
  }

  // 确保分数在 0-100 之间
  score = Math.max(0, Math.min(100, score));

  // 根据分数确定等级和颜色
  let grade = '';
  let gradeColor = '';
  let emoji = '';
  if (score >= 90) {
    grade = '优秀';
    gradeColor = 'text-green-600 dark:text-green-400';
    emoji = '🎉';
  } else if (score >= 75) {
    grade = '良好';
    gradeColor = 'text-blue-600 dark:text-blue-400';
    emoji = '👍';
  } else if (score >= 60) {
    grade = '一般';
    gradeColor = 'text-yellow-600 dark:text-yellow-400';
    emoji = '😐';
  } else {
    grade = '需改进';
    gradeColor = 'text-red-600 dark:text-red-400';
    emoji = '⚠️';
  }

  const progressColor = score >= 90
    ? 'bg-green-500'
    : score >= 75
    ? 'bg-blue-500'
    : score >= 60
    ? 'bg-yellow-500'
    : 'bg-red-500';

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Sparkles className="h-5 w-5" />
          消费健康度评分
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-6xl">{emoji}</div>
              <div>
                <div className={`text-4xl font-bold ${gradeColor}`}>
                  {score}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  综合评分
                </div>
              </div>
            </div>
            <div className={`text-2xl font-semibold ${gradeColor}`}>
              {grade}
            </div>
          </div>

          {/* 进度条 */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${score}%` }}
            />
          </div>

          {/* 改进建议 */}
          {reasons.length > 0 && (
            <div className="mt-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                改进建议：
              </h4>
              <ul className="space-y-1">
                {reasons.map((reason, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 类别分布组件
function CategoryBreakdownCard({ categoryBreakdown }: { categoryBreakdown: WeeklyReport['category_breakdown'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>消费类别分布</CardTitle>
      </CardHeader>
      <CardContent>
        {categoryBreakdown.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>暂无分类数据</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categoryBreakdown.map((cat, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {getCategoryName(cat.category)}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {cat.count} 笔
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      ¥{formatCurrency(cat.amount)}
                    </span>
                    <span className="text-sm text-purple-600 dark:text-purple-400 w-12 text-right">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewTab({ report }: OverviewTabProps) {
  return (
    <TabsContent value="overview">
      <div className="space-y-8">
        <HealthScoreCard report={report} />
        <CategoryBreakdownCard categoryBreakdown={report.category_breakdown} />
      </div>
    </TabsContent>
  );
}
