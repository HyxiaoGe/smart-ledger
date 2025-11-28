import { CATEGORY_NAMES, CATEGORY_ICONS, CATEGORY_OPTIMIZATION_CONFIG } from './constants';

/**
 * 趋势分析数据类型
 */
export interface TrendAnalysisData {
  currentMonth: number;
  lastMonth: number;
  changePercent: number;
  changeAmount: number;
  categories: Array<{
    category: string;
    current: number;
    last: number;
    changePercent: number;
    icon: string;
  }>;
}

/**
 * 优化建议项类型
 */
export interface Suggestion {
  category: string;
  suggestion: string;
  potential: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * 个性化建议数据类型
 */
export interface PersonalizedAdviceData {
  recommendedBudget: number;
  suggestedSavings: number;
  suggestions: Suggestion[];
}

/**
 * 处理趋势分析数据
 */
export function processTrendAnalysisData(aiData: any): TrendAnalysisData | null {
  if (!aiData) return null;

  try {
    const currentData = aiData.currentMonthFull;
    const lastData = aiData.lastMonth;

    // 过滤掉固定支出（自动生成的交易记录）
    const filteredCurrentData = currentData.filter(
      (t: any) => !t.is_auto_generated && !t.recurring_expense_id
    );
    const filteredLastData = lastData.filter(
      (t: any) => !t.is_auto_generated && !t.recurring_expense_id
    );

    // 计算月度总计
    const currentTotal = filteredCurrentData.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
    const lastTotal = filteredLastData.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
    const changeAmount = currentTotal - lastTotal;
    const changePercent = lastTotal > 0 ? (changeAmount / lastTotal) * 100 : 0;

    // 按分类聚合数据
    const categoryAnalysis: TrendAnalysisData['categories'] = [];

    const allCategories = new Set([
      ...filteredCurrentData.map((t: any) => t.category),
      ...filteredLastData.map((t: any) => t.category)
    ]);

    allCategories.forEach(category => {
      const current = filteredCurrentData
        .filter((t: any) => t.category === category)
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
      const last = filteredLastData
        .filter((t: any) => t.category === category)
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
      const categoryChange = last > 0 ? ((current - last) / last) * 100 : 0;

      categoryAnalysis.push({
        category,
        current,
        last,
        changePercent: categoryChange,
        icon: CATEGORY_ICONS[category] || '💰'
      });
    });

    return {
      currentMonth: currentTotal,
      lastMonth: lastTotal,
      changePercent,
      changeAmount,
      categories: categoryAnalysis
    };
  } catch (error) {
    console.error('处理趋势分析失败:', error);
    return null;
  }
}

/**
 * 处理个性化建议数据
 */
export function processPersonalizedAdviceData(aiData: any): PersonalizedAdviceData | null {
  if (!aiData) return null;

  try {
    const currentData = aiData.currentMonthFull;

    // 过滤掉固定支出（自动生成的交易记录）
    const filteredCurrentData = currentData.filter(
      (t: any) => !t.is_auto_generated && !t.recurring_expense_id
    );

    const totalExpense = filteredCurrentData.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
    const categoryTotals: Record<string, number> = {};

    filteredCurrentData.forEach((t: any) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    // 生成建议
    const suggestions = generateAdvancedSuggestions(filteredCurrentData, categoryTotals, totalExpense);

    // 计算推荐的预算和储蓄目标
    const recommendedBudget = Math.round(totalExpense * 0.9); // 建议减少10%
    const suggestedSavings = suggestions.reduce((sum, s) => sum + s.potential, 0);

    return {
      recommendedBudget,
      suggestedSavings,
      suggestions: suggestions.slice(0, 6) // 限制建议数量
    };
  } catch (error) {
    console.error('处理个性化建议失败:', error);
    return null;
  }
}

/**
 * 生成全面且深入的建议
 */
function generateAdvancedSuggestions(
  currentData: any[],
  categoryTotals: Record<string, number>,
  totalExpense: number
): PersonalizedAdviceData['suggestions'] {
  const newSuggestions: PersonalizedAdviceData['suggestions'] = [];
  const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);

  // 1. 高支出类别深入分析
  sortedCategories.slice(0, 3).forEach(([category, amount]) => {
    const percent = (amount / totalExpense) * 100;

    // 基于类别特性的深度建议
    const categoryData = currentData.filter(t => t.category === category);
    const avgAmount = categoryData.length > 0 ? amount / categoryData.length : 0;
    const frequency = categoryData.length;

    let suggestionText = '';
    let potentialSavings = 0;
    let priority: 'high' | 'medium' | 'low' = 'medium';

    // 根据不同类别给出个性化建议
    switch (category) {
      case 'food':
        if (avgAmount > 50 && frequency > 10) {
          suggestionText = `${CATEGORY_NAMES[category]}支出较高(¥${avgAmount.toFixed(0)}/次，${frequency}次)，建议考虑增加在家做饭的频率，可节省约¥${Math.round(amount * 0.25)}`;
          potentialSavings = Math.round(amount * 0.25);
          priority = 'high';
        } else if (percent > 40) {
          suggestionText = `${CATEGORY_NAMES[category]}占比较高(${percent.toFixed(1)}%)，建议优化餐饮结构，减少高价位餐饮消费`;
          potentialSavings = Math.round(amount * 0.15);
          priority = 'medium';
        }
        break;

      case 'transport':
        if (frequency > 15) {
          suggestionText = `${CATEGORY_NAMES[category]}频繁(${frequency}次)，建议考虑公共交通月卡或拼车方案，预计节省¥${Math.round(amount * 0.2)}`;
          potentialSavings = Math.round(amount * 0.2);
          priority = 'medium';
        } else {
          suggestionText = `${CATEGORY_NAMES[category]}支出¥${amount.toFixed(0)}，建议规划路线以减少交通成本`;
          potentialSavings = Math.round(amount * 0.1);
          priority = 'low';
        }
        break;

      case 'shopping':
        suggestionText = `${CATEGORY_NAMES[category]}支出¥${amount.toFixed(0)}(${frequency}次)，建议制定购物清单，避免冲动消费，可节省¥${Math.round(amount * 0.3)}`;
        potentialSavings = Math.round(amount * 0.3);
        priority = 'high';
        break;

      case 'entertainment':
        suggestionText = `${CATEGORY_NAMES[category]}支出¥${amount.toFixed(0)}，建议寻找免费或低价的娱乐活动，预计节省¥${Math.round(amount * 0.4)}`;
        potentialSavings = Math.round(amount * 0.4);
        priority = 'medium';
        break;

      case 'drink':
        const dailyAvg = avgAmount;
        if (dailyAvg > 15 && frequency > 10) {
          suggestionText = `饮品消费较高(¥${dailyAvg.toFixed(0)}/次)，建议减少高价咖啡/奶茶频次，自制饮品可节省¥${Math.round(amount * 0.5)}`;
          potentialSavings = Math.round(amount * 0.5);
          priority = 'high';
        }
        break;

      default:
        if (percent > 30) {
          suggestionText = `${CATEGORY_NAMES[category] || category}支出占比较高(${percent.toFixed(1)}%)，建议审视该类别的必要性和优化空间`;
          potentialSavings = Math.round(amount * 0.15);
          priority = 'medium';
        }
    }

    if (suggestionText) {
      newSuggestions.push({
        category: CATEGORY_NAMES[category] || category,
        suggestion: suggestionText,
        potential: potentialSavings,
        priority
      });
    }
  });

  // 2. 支出模式分析
  const weekdaySpending = currentData.filter(t => {
    const day = new Date(t.date).getDay();
    return day >= 1 && day <= 5; // 周一到周五
  }).reduce((sum, t) => sum + t.amount, 0);

  const weekendSpending = currentData.filter(t => {
    const day = new Date(t.date).getDay();
    return day === 0 || day === 6; // 周末
  }).reduce((sum, t) => sum + t.amount, 0);

  if (weekendSpending > weekdaySpending * 0.6 && currentData.length > 5) {
    newSuggestions.push({
      category: '消费模式',
      suggestion: `周末消费较高(¥${weekendSpending.toFixed(0)})，建议提前规划周末活动预算，避免超支`,
      potential: Math.round(weekendSpending * 0.2),
      priority: 'medium'
    });
  }

  // 3. 预算优化建议
  const dailyAvg = totalExpense / 30;
  if (dailyAvg > 100) {
    newSuggestions.push({
      category: '预算管理',
      suggestion: `日均可变支出¥${dailyAvg.toFixed(0)}偏高，建议设定每日消费上限¥${Math.round(dailyAvg * 0.8)}，强制储蓄`,
      potential: Math.round(totalExpense * 0.15),
      priority: 'high'
    });
  }

  // 4. 消费时机建议
  const highAmountTransactions = currentData.filter(t => t.amount > 100);
  if (highAmountTransactions.length > 0) {
    newSuggestions.push({
      category: '消费时机',
      suggestion: `大额消费(${highAmountTransactions.length}笔)建议提前规划，考虑24小时冷静期规则，避免冲动消费`,
      potential: Math.round(highAmountTransactions.reduce((sum, t) => sum + t.amount, 0) * 0.1),
      priority: 'medium'
    });
  }

  // 5. 储蓄目标建议
  if (newSuggestions.length === 0) {
    newSuggestions.push({
      category: '综合建议',
      suggestion: '您的可变支出结构合理，建议继续保持并考虑增加投资理财比例',
      potential: 0,
      priority: 'low'
    });
  }

  return newSuggestions;
}
