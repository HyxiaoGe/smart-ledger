import { NextRequest } from 'next/server';
import { chat } from '@/lib/clients/ai/client';
import { getPredictionData } from '@/lib/services/transactions.server';
import { memoryCache } from '@/lib/infrastructure/cache';
import { CACHE_TTL, CACHE_PREFIXES } from '@/lib/config/cacheConfig';
import { AIFeedbackService } from '@/lib/services/ai/AIFeedbackService.server';
import { withErrorHandler, ApiError } from '@/lib/utils/apiErrorHandler';

export const runtime = 'nodejs';

const aiFeedbackService = AIFeedbackService.getInstance();

/**
 * 支出预测API
 * 基于历史数据预测未来支出，包括异常检测和预算建议
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { type = 'spending-prediction', monthsToAnalyze = 6, predictionMonths = 3 } = body;

  // 获取历史数据
  const predictionData = await getPredictionData(monthsToAnalyze);

  // 检查数据质量
  if (!predictionData.overallStats.dataQuality.sufficientData) {
    return Response.json({
      error: '数据不足',
      message: `需要至少3个月的历史数据，当前只有${predictionData.overallStats.totalMonths}个月`,
      data: predictionData
    }, { status: 400 });
  }

  let result;

  switch (type) {
    case 'spending-prediction':
      result = await handleSpendingPrediction(predictionData, predictionMonths, monthsToAnalyze);
      break;
    case 'anomaly-detection':
      result = await handleAnomalyDetection(predictionData);
      break;
    case 'budget-recommendation':
      result = await handleBudgetRecommendation(predictionData, predictionMonths);
      break;
    case 'comprehensive-analysis':
      result = await handleComprehensiveAnalysis(predictionData, predictionMonths, monthsToAnalyze);
      break;
    default:
      throw new ApiError('不支持的预测类型', 400);
  }

  return Response.json({
    type,
    dataQuality: predictionData.overallStats.dataQuality,
    analysisMonths: predictionData.overallStats.totalMonths,
    generatedAt: new Date().toISOString(),
    ...result
  });
});

/**
 * 支出预测处理
 */
async function handleSpendingPrediction(predictionData: any, predictionMonths: number, monthsToAnalyze: number = 6) {
  // 构建缓存键
  const cacheKey = `${CACHE_PREFIXES.PREDICTION}:${JSON.stringify({
    monthsToAnalyze,
    predictionMonths,
    lastTransactionDate: predictionData.monthlyData[0]?.month,
    transactionCount: predictionData.overallStats.totalTransactions
  })}`;

  // 检查缓存
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 缓存不存在，执行预测
  const result = await (async () => {
  
      // 记录AI请求到数据库
      const startTime = Date.now();

      const sys = `你是一名专业的财务预测分析师，请基于用户的历史支出数据进行智能预测分析。

**任务要求：**
1. 分析用户${predictionData.overallStats.totalMonths}个月的支出模式和趋势
2. 深度分析季节性特征、支出规律性和时间分布模式
3. 预测未来${predictionMonths}个月的支出范围和分类支出
4. 识别异常模式并评估预测风险
5. 提供基于数据驱动的预算优化建议

**数据维度：**
- 月度支出趋势：历史数据和季节性变化
- 分类分析：各类别的支出模式和稳定性
- 支出规律性：频率、时间分布、消费习惯
- 季节性模式：季度趋势和月度变异系数
- 时间偏好：高峰时段和消费日期偏好

**输出格式：**
直接输出纯净的JSON，不要包含任何代码块标记、解释或格式化：
{
  "predictions": [
    {
      "month": "2024-02",
      "totalAmount": 2500,
      "confidence": 85,
      "categoryBreakdown": [
        {"category": "food", "amount": 800, "confidence": 90},
        {"category": "transport", "amount": 300, "confidence": 85}
      ]
    }
  ],
  "trends": {
    "overall": "increasing",
    "keyCategories": [
      {"category": "food", "trend": "increasing", "changeRate": 15}
    ]
  },
  "insights": [
    "基于历史模式，下月支出可能增加15%",
    "餐饮支出呈上升趋势，建议控制"
  ],
  "riskFactors": [
    {
      "type": "seasonal",
      "description": "春节期间支出可能增加",
      "severity": "medium"
    }
  ]
}

**重要要求：**
1. 直接输出JSON，不要使用代码块标记
2. 预测金额要合理，基于历史数据的平均值、趋势和季节性
3. 置信度评估：数据规律性高(>80%) -> 高置信度(85-95%)，规律性低(60%) -> 低置信度(60-75%)
4. 季节性考虑：季节性强的支出要相应调整预测
5. insight要具体可行，基于数据分析，不超过2条
6. 考虑时间偏好：工作日/周末消费模式影响预测
7. 确保JSON格式完全正确`;

  const user = `历史数据分析：
${JSON.stringify({
  monthlyData: predictionData.monthlyData.slice(0, 6).reverse(), // 最近6个月，按时间顺序
  categoryAnalysis: predictionData.categoryAnalysis,
  overallStats: predictionData.overallStats,
  advancedAnalysis: predictionData.advancedAnalysis || {
    spendingPatterns: { frequency: 0, avgAmount: 0, regularityScore: 0 },
    seasonalPatterns: { seasonality: 'low', quarterlyTrends: [], monthlyVariation: 0 },
    timeDistribution: { peakHours: [], peakDays: [], timePreference: 'none' }
  }
}, null, 2)}

请基于以上详细数据预测未来${predictionMonths}个月的支出情况。重点考虑：
1. 支出规律性和季节性变化
2. 高峰消费时段和类别偏好
3. 历史数据的变异系数和趋势

预测要求：
- 置信度基于数据规律性和历史变异性
- 考虑季节性因素（如节假日影响）
- 分析类别支出的稳定性
- 提供基于时间模式的合理预测`;

  const aiResponse = await chat([
    { role: 'system', content: sys },
    { role: 'user', content: user }
  ]);

  try {
    // 清理AI响应中的Markdown代码块标记
    let cleanedResponse = aiResponse.trim();

    // 移除可能的代码块标记
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // 尝试解析清理后的JSON
    const aiResult = JSON.parse(cleanedResponse);
    const result = {
      predictions: aiResult.predictions || [],
      trends: aiResult.trends || {},
      insights: aiResult.insights || [],
      riskFactors: aiResult.riskFactors || []
    };

        // 记录AI请求日志到数据库
        const responseTime = Date.now() - startTime;
        await aiFeedbackService.logAIRequest(
          'deepseek',
          'deepseek-chat',
          'spending-prediction',
          'prediction',
          { monthsToAnalyze, predictionMonths },
          sys + '\n\n' + user,
          result, // 完整的响应数据
          responseTime,
          { input: 2000, output: 500, total: 2500 }, // 估算token使用量
          'success'
        );

        return result;
      } catch (parseError) {
        console.error('AI预测结果解析失败:', parseError);
  
        // 记录失败的AI请求
        const responseTime = Date.now() - startTime;
        await aiFeedbackService.logAIRequest(
          'deepseek',
          'deepseek-chat',
          'spending-prediction',
          'prediction',
          { monthsToAnalyze, predictionMonths },
          sys + '\n\n' + user,
          null, // 响应数据为空
          responseTime,
          { input: 2000, output: 0, total: 2000 },
          'error',
          'JSON parsing failed'
        );

        // 降级到规则引擎预测
        return generateRuleBasedPrediction(predictionData, predictionMonths);
      }
  })();

  // 缓存结果
  memoryCache.set(cacheKey, result, { ttl: CACHE_TTL.PREDICTION });
  return result;
}

/**
 * 异常检测处理
 */
async function handleAnomalyDetection(predictionData: any) {
  const { monthlyData, categoryAnalysis } = predictionData;

  // 规则引擎异常检测
  const anomalies: any[] = [];

  // 检测月度支出异常
  const amounts = monthlyData.map((m: any) => m.totalAmount);
  const avgAmount = amounts.reduce((sum: number, a: number) => sum + a, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.reduce((sum: number, a: number) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length);

  monthlyData.forEach((month: any) => {
    const zScore = Math.abs((month.totalAmount - avgAmount) / stdDev);
    if (zScore > 2) { // 2个标准差外视为异常
      anomalies.push({
        type: 'spending_spike',
        month: month.month,
        amount: month.totalAmount,
        expected: avgAmount,
        deviation: Math.round(zScore * 10) / 10,
        severity: zScore > 3 ? 'high' : 'medium',
        description: `${month.month}支出异常${month.totalAmount > avgAmount ? '偏高' : '偏低'}`
      });
    }
  });

  // 检测类别支出异常
  categoryAnalysis.forEach((category: any) => {
    if (category.trend > 50) { // 增长超过50%
      anomalies.push({
        type: 'category_increase',
        category: category.category,
        trend: Math.round(category.trend),
        severity: category.trend > 100 ? 'high' : 'medium',
        description: `${category.category}支出增长过快(${category.trend.toFixed(1)}%)`
      });
    }
  });

  return {
    anomalies,
    overallStability: {
      stable: anomalies.length === 0,
      score: Math.max(0, 100 - anomalies.length * 10),
      description: anomalies.length === 0 ? '支出模式稳定' : '发现支出异常波动'
    }
  };
}

/**
 * 预算建议处理
 */
async function handleBudgetRecommendation(predictionData: any, predictionMonths: number) {
  const { categoryAnalysis, overallStats } = predictionData;

  // 基于历史平均支出生成预算建议
  const avgMonthlySpending = overallStats.avgMonthlySpending;

  const categoryBudgets = categoryAnalysis.map((category: any) => {
    const avgCategorySpending = category.avgAmount;
    const recommendedBudget = Math.round(avgCategorySpending * 0.9); // 建议减少10%
    const potentialSavings = Math.round(avgCategorySpending * 0.1);

    return {
      category: category.category,
      currentAvg: avgCategorySpending,
      recommendedBudget,
      potentialSavings,
      priority: potentialSavings > 200 ? 'high' : potentialSavings > 50 ? 'medium' : 'low'
    };
  });

  // 总体预算建议
  const totalRecommendedBudget = categoryBudgets.reduce((sum: number, b: any) => sum + b.recommendedBudget, 0);
  const totalPotentialSavings = categoryBudgets.reduce((sum: number, b: any) => sum + b.potentialSavings, 0);

  return {
    monthlyBudget: {
      current: Math.round(avgMonthlySpending),
      recommended: totalRecommendedBudget,
      potentialSavings: totalPotentialSavings,
      savingsRate: Math.round((totalPotentialSavings / avgMonthlySpending) * 100)
    },
    categoryBudgets: categoryBudgets.sort((a: any, b: any) => b.potentialSavings - a.potentialSavings),
    timeframe: `${predictionMonths}个月预算规划`,
    achievable: totalPotentialSavings > 0
  };
}

/**
 * 综合分析处理
 */
async function handleComprehensiveAnalysis(predictionData: any, predictionMonths: number, monthsToAnalyze: number = 6) {
  // 并行执行各种分析
  const [spendingPrediction, anomalyDetection, budgetRecommendation] = await Promise.all([
    handleSpendingPrediction(predictionData, predictionMonths, monthsToAnalyze),
    handleAnomalyDetection(predictionData),
    handleBudgetRecommendation(predictionData, predictionMonths)
  ]);

  return {
    spendingPrediction,
    anomalyDetection,
    budgetRecommendation,
    summary: {
      dataQuality: predictionData.overallStats.dataQuality,
      forecastAccuracy: spendingPrediction.predictions.length > 0 ? 'medium' : 'low',
      riskLevel: anomalyDetection.anomalies.length > 0 ? 'medium' : 'low',
      optimizationPotential: budgetRecommendation.monthlyBudget.potentialSavings
    }
  };
}

/**
 * 规则引擎预测（AI失败时的降级方案）
 */
function generateRuleBasedPrediction(predictionData: any, predictionMonths: number) {
  const { monthlyData, categoryAnalysis } = predictionData;

  // 简单的移动平均预测
  const recentMonths = monthlyData.slice(0, 3); // 最近3个月
  const avgSpending = recentMonths.reduce((sum: number, m: any) => sum + m.totalAmount, 0) / recentMonths.length;

  const predictions: any[] = [];
  for (let i = 1; i <= predictionMonths; i++) {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + i);
    const monthStr = futureDate.toISOString().slice(0, 7);

    predictions.push({
      month: monthStr,
      totalAmount: Math.round(avgSpending * (1 + (Math.random() - 0.5) * 0.2)), // ±10%随机波动
      confidence: 60, // 规则引擎置信度较低
      categoryBreakdown: categoryAnalysis.map((cat: any) => ({
        category: cat.category,
        amount: Math.round(cat.avgAmount * (1 + (Math.random() - 0.5) * 0.2)),
        confidence: 60
      }))
    });
  }

  return {
    predictions,
    trends: {
      overall: 'stable',
      keyCategories: categoryAnalysis.slice(0, 3).map((cat: any) => ({
        category: cat.category,
        trend: cat.trend > 10 ? 'increasing' : cat.trend < -10 ? 'decreasing' : 'stable',
        changeRate: Math.round(cat.trend)
      }))
    },
    insights: [
      '基于历史数据的规则引擎预测',
      '建议积累更多数据以提高预测准确性'
    ],
    riskFactors: [],
    fallback: true // 标识这是降级方案
  };
}