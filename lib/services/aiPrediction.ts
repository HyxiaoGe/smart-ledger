/**
 * AI 预测服务 - 自动分类和金额预测
 *
 * @deprecated 此服务将在后续版本中重构，建议关注以下改进：
 * - 应迁移到统一的 Repository 层 (ITransactionRepository)
 * - 应使用统一缓存系统 (@/lib/infrastructure/cache)
 * - 应与 TransactionAnalyticsService 集成
 * - 内部缓存实现应替换为 CacheDecorator
 *
 * 当前版本保持功能完整性，暂不修改核心逻辑。
 * 未来优化方向：
 * 1. 数据访问层使用 Repository 抽象
 * 2. 缓存管理使用统一 ICache 接口
 * 3. 与分析服务解耦，提供独立的预测能力
 */

// AI预测服务 - 自动分类和金额预测
import { supabase } from '@/lib/clients/supabase/client';
import { generateTimeContext } from '@/lib/domain/noteContext';
import {
  CONSUMPTION_PATTERNS,
  matchConsumptionPattern,
  getConsumptionStats,
  type ConsumptionPattern
} from './smartPatterns';

export interface TransactionPrediction {
  id: string;
  type: 'category' | 'amount' | 'full';
  confidence: number;
  reason: string;
  predictedCategory?: string;
  predictedAmount?: number;
  suggestedNote?: string;
  metadata?: {
    historicalData?: any;
    timeContext?: string;
    pattern?: ConsumptionPattern;
  };
}

export interface QuickTransactionSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  note: string;
  confidence: number;
  icon?: string;
  reason: string;
}

/**
 * AI预测服务类
 */
export class AIPredictionService {
  private static instance: AIPredictionService;
  /**
   * @deprecated 应使用统一缓存系统 (@/lib/infrastructure/cache) 替代内部缓存实现
   */
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  static getInstance(): AIPredictionService {
    if (!AIPredictionService.instance) {
      AIPredictionService.instance = new AIPredictionService();
    }
    return AIPredictionService.instance;
  }

  /**
   * 基于时间上下文预测可能的交易
   */
  async predictTransaction(context?: {
    timeContext?: string;
    recentTransactions?: any[];
    userPreferences?: any;
  }): Promise<TransactionPrediction[]> {
    const cacheKey = `predict-${JSON.stringify(context)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const timeContext = context?.timeContext || generateTimeContext();
    const predictions: TransactionPrediction[] = [];

    // 1. 基于时间模式的预测
    const timeBasedPredictions = await this.generateTimeBasedPredictions(timeContext);
    predictions.push(...timeBasedPredictions);

    // 2. 基于历史模式的预测
    const patternBasedPredictions = await this.generatePatternBasedPredictions(timeContext);
    predictions.push(...patternBasedPredictions);

    // 3. 基于最近交易的预测
    if (context?.recentTransactions && context.recentTransactions.length > 0) {
      const recentBasedPredictions = await this.generateRecentBasedPredictions(
        context.recentTransactions,
        timeContext
      );
      predictions.push(...recentBasedPredictions);
    }

    // 排序和去重
    const sortedPredictions = predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);

    this.setCache(cacheKey, sortedPredictions);
    return sortedPredictions;
  }

  /**
   * 预测分类（基于金额和其他上下文）
   */
  async predictCategory(amount: number, timeContext?: string): Promise<TransactionPrediction[]> {
    const predictions: TransactionPrediction[] = [];

    // 1. 基于消费模式的分类预测
    for (const pattern of CONSUMPTION_PATTERNS) {
      if (amount >= pattern.amountRange.min && amount <= pattern.amountRange.max) {
        predictions.push({
          id: `pattern-${pattern.category}`,
          type: 'category',
          confidence: pattern.confidence,
          reason: `金额 ¥${amount} 匹配${pattern.category}类消费模式 (¥${pattern.amountRange.min}-${pattern.amountRange.max})`,
          predictedCategory: pattern.category,
          metadata: {
            pattern,
            timeContext: timeContext || generateTimeContext().label
          }
        });
      }
    }

    // 2. 基于历史数据的分类预测
    const historicalPredictions = await this.predictCategoryFromHistory(amount, timeContext);
    predictions.push(...historicalPredictions);

    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  /**
   * 预测金额（基于分类和其他上下文）
   */
  async predictAmount(category: string, timeContext?: string): Promise<TransactionPrediction[]> {
    const predictions: TransactionPrediction[] = [];

    // 1. 基于消费模式的金额预测
    const matchingPatterns = CONSUMPTION_PATTERNS.filter(p => p.category === category);
    for (const pattern of matchingPatterns) {
      if (pattern.pricePoints && pattern.pricePoints.length > 0) {
        for (const pricePoint of pattern.pricePoints) {
          predictions.push({
            id: `price-${category}-${pricePoint}`,
            type: 'amount',
            confidence: pattern.confidence * 0.9,
            reason: `${category}类常见价格点 ¥${pricePoint}`,
            predictedAmount: pricePoint,
            predictedCategory: category,
            metadata: {
              pattern,
              timeContext: timeContext || generateTimeContext().label
            }
          });
        }
      }

      // 2. 基于金额范围的预测
      const avgAmount = (pattern.amountRange.min + pattern.amountRange.max) / 2;
      predictions.push({
        id: `range-${category}-${avgAmount}`,
        type: 'amount',
        confidence: pattern.confidence * 0.7,
        reason: `${category}类平均消费 ¥${avgAmount.toFixed(2)}`,
        predictedAmount: avgAmount,
        predictedCategory: category,
        metadata: {
          pattern,
          timeContext: timeContext || generateTimeContext().label
        }
      });
    }

    // 3. 基于历史数据的金额预测
    const historicalPredictions = await this.predictAmountFromHistory(category, timeContext);
    predictions.push(...historicalPredictions);

    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  /**
   * 生成快速记账建议
   */
  async generateQuickSuggestions(timeContext?: string): Promise<QuickTransactionSuggestion[]> {
    const cacheKey = `quick-${timeContext}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const currentTime = timeContext || generateTimeContext();
    const suggestions: QuickTransactionSuggestion[] = [];

    // 基于时间的高频消费建议
    const timeBasedSuggestions = this.generateTimeBasedQuickSuggestions(currentTime);
    suggestions.push(...timeBasedSuggestions);

    // 基于消费模式的通用建议
    const patternBasedSuggestions = this.generatePatternBasedQuickSuggestions(currentTime);
    suggestions.push(...patternBasedSuggestions);

    // 排序并限制数量
    const sortedSuggestions = suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 6);

    this.setCache(cacheKey, sortedSuggestions);
    return sortedSuggestions;
  }

  /**
   * 基于时间模式生成预测
   */
  private async generateTimeBasedPredictions(timeContext: any): Promise<TransactionPrediction[]> {
    const predictions: TransactionPrediction[] = [];
    const hour = timeContext.hour;
    const isWeekend = timeContext.isWeekend;

    // 早高峰通勤预测
    if ((hour >= 7 && hour <= 9) && !isWeekend) {
      predictions.push({
        id: 'morning-commute',
        type: 'full',
        confidence: 0.85,
        reason: '工作日早高峰通勤时间',
        predictedCategory: 'transport',
        predictedAmount: 6.00,
        suggestedNote: '地铁通行费用',
        metadata: { timeContext: timeContext.label }
      });
    }

    // 午餐时间预测
    if (hour >= 11 && hour <= 14) {
      predictions.push({
        id: 'lunch-time',
        type: 'full',
        confidence: 0.9,
        reason: timeContext.isWeekend ? '周末午餐时间' : '工作日午餐时间',
        predictedCategory: 'food',
        predictedAmount: 16.82,
        suggestedNote: '午饭',
        metadata: { timeContext: timeContext.label }
      });
    }

    // 晚餐时间预测
    if (hour >= 17 && hour <= 21) {
      predictions.push({
        id: 'dinner-time',
        type: 'full',
        confidence: 0.8,
        reason: timeContext.isWeekend ? '周末晚餐时间' : '工作日晚餐时间',
        predictedCategory: 'food',
        predictedAmount: 17.73,
        suggestedNote: '晚饭',
        metadata: { timeContext: timeContext.label }
      });
    }

    // 晚高峰通勤预测
    if ((hour >= 17 && hour <= 19) && !isWeekend) {
      predictions.push({
        id: 'evening-commute',
        type: 'full',
        confidence: 0.8,
        reason: '工作日晚高峰通勤时间',
        predictedCategory: 'transport',
        predictedAmount: 6.00,
        suggestedNote: '地铁通行费用',
        metadata: { timeContext: timeContext.label }
      });
    }

    return predictions;
  }

  /**
   * 基于消费模式生成预测
   */
  private async generatePatternBasedPredictions(timeContext: any): Promise<TransactionPrediction[]> {
    const predictions: TransactionPrediction[] = [];
    const hour = timeContext.hour;

    // 咖啡时间预测
    if ((hour >= 8 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      predictions.push({
        id: 'coffee-time',
        type: 'full',
        confidence: 0.75,
        reason: '咖啡时间（基于历史消费模式）',
        predictedCategory: 'drink',
        predictedAmount: 11.54,
        suggestedNote: '瑞幸',
        metadata: { timeContext: timeContext.label }
      });
    }

    return predictions;
  }

  /**
   * 基于最近交易生成预测
   */
  private async generateRecentBasedPredictions(
    recentTransactions: any[],
    timeContext: any
  ): Promise<TransactionPrediction[]> {
    const predictions: TransactionPrediction[] = [];

    // 分析最近交易的模式
    const recentPattern = this.analyzeRecentTransactions(recentTransactions);

    if (recentPattern.frequentCategory) {
      predictions.push({
        id: 'recent-pattern',
        type: 'category',
        confidence: 0.7,
        reason: `最近频繁使用${recentPattern.frequentCategory}类别`,
        predictedCategory: recentPattern.frequentCategory,
        predictedAmount: recentPattern.avgAmount,
        metadata: {
          historicalData: recentPattern,
          timeContext: timeContext.label
        }
      });
    }

    return predictions;
  }

  /**
   * 基于历史数据预测分类
   */
  private async predictCategoryFromHistory(amount: number, timeContext?: string): Promise<TransactionPrediction[]> {
    const predictions: TransactionPrediction[] = [];

    try {
      // 查询相似金额的历史交易
      const { data: similarTransactions, error } = await supabase
        .from('transactions')
        .select('category, amount, note')
        .gte('amount', amount * 0.8)
        .lte('amount', amount * 1.2)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(50);

      if (error || !similarTransactions || similarTransactions.length === 0) {
        return predictions;
      }

      // 统计各类别出现频率
      const categoryFrequency: Record<string, { count: number; totalAmount: number; examples: string[] }> = {};

      similarTransactions.forEach(transaction => {
        if (!categoryFrequency[transaction.category]) {
          categoryFrequency[transaction.category] = { count: 0, totalAmount: 0, examples: [] };
        }
        categoryFrequency[transaction.category].count++;
        categoryFrequency[transaction.category].totalAmount += transaction.amount;
        if (categoryFrequency[transaction.category].examples.length < 3) {
          categoryFrequency[transaction.category].examples.push(transaction.note || '');
        }
      });

      // 生成预测
      Object.entries(categoryFrequency).forEach(([category, data]) => {
        const confidence = Math.min(data.count / 20, 0.85);
        if (confidence > 0.3) {
          predictions.push({
            id: `hist-category-${category}`,
            type: 'category',
            confidence,
            reason: `历史数据中${data.count}次相似金额使用${category}类别`,
            predictedCategory: category,
            metadata: {
              historicalData: {
                count: data.count,
                avgAmount: data.totalAmount / data.count,
                examples: data.examples
              },
              timeContext
            }
          });
        }
      });
    } catch (error) {
      console.error('历史分类预测失败:', error);
    }

    return predictions;
  }

  /**
   * 基于历史数据预测金额
   */
  private async predictAmountFromHistory(category: string, timeContext?: string): Promise<TransactionPrediction[]> {
    const predictions: TransactionPrediction[] = [];

    try {
      // 查询该分类的最近交易
      const { data: categoryTransactions, error } = await supabase
        .from('transactions')
        .select('amount, note, date')
        .eq('category', category)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(100);

      if (error || !categoryTransactions || categoryTransactions.length === 0) {
        return predictions;
      }

      // 统计金额频率
      const amountFrequency: Record<string, number> = {};
      const amounts: number[] = [];

      categoryTransactions.forEach(transaction => {
        const roundedAmount = Math.round(transaction.amount * 100) / 100; // 保留两位小数
        amountFrequency[roundedAmount] = (amountFrequency[roundedAmount] || 0) + 1;
        amounts.push(transaction.amount);
      });

      // 计算统计数据
      const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      const medianAmount = this.calculateMedian(amounts);

      // 生成常见金额预测
      Object.entries(amountFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([amountStr, frequency]) => {
          const amount = parseFloat(amountStr);
          const confidence = Math.min(frequency / 15, 0.8);

          if (confidence > 0.3) {
            predictions.push({
              id: `hist-amount-${category}-${amount}`,
              type: 'amount',
              confidence,
              reason: `${category}类历史消费${frequency}次为¥${amount}`,
              predictedAmount: amount,
              predictedCategory: category,
              metadata: {
                historicalData: {
                  frequency,
                  avgAmount,
                  medianAmount
                },
                timeContext
              }
            });
          }
        });

      // 添加平均金额预测
      if (predictions.length < 3) {
        predictions.push({
          id: `hist-avg-${category}`,
          type: 'amount',
          confidence: 0.6,
          reason: `${category}类平均消费¥${avgAmount.toFixed(2)}`,
          predictedAmount: Math.round(avgAmount * 100) / 100,
          predictedCategory: category,
          metadata: {
            historicalData: { avgAmount, medianAmount },
            timeContext
          }
        });
      }
    } catch (error) {
      console.error('历史金额预测失败:', error);
    }

    return predictions;
  }

  /**
   * 生成基于时间的快速建议
   */
  private generateTimeBasedQuickSuggestions(timeContext: any): QuickTransactionSuggestion[] {
    const suggestions: QuickTransactionSuggestion[] = [];
    const hour = timeContext.hour;
    const isWeekend = timeContext.isWeekend;

    // 工作日早高峰
    if (!isWeekend && (hour >= 7 && hour <= 9)) {
      suggestions.push({
        id: 'quick-morning-commute',
        title: '早高峰通勤',
        description: '地铁通行费用',
        category: 'transport',
        amount: 6.00,
        note: '地铁通行费用',
        confidence: 0.9,
        icon: '🚇',
        reason: '工作日早高峰通勤时间'
      });
    }

    // 午餐时间
    if (hour >= 11 && hour <= 14) {
      suggestions.push({
        id: 'quick-lunch',
        title: '午餐',
        description: isWeekend ? '周末午餐' : '工作日午餐',
        category: 'food',
        amount: 16.82,
        note: '午饭',
        confidence: 0.95,
        icon: '🍱',
        reason: `${isWeekend ? '周末' : '工作日'}午餐时间`
      });
    }

    // 咖啡时间
    if ((hour >= 8 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      suggestions.push({
        id: 'quick-coffee',
        title: '咖啡',
        description: '瑞幸咖啡',
        category: 'drink',
        amount: 11.54,
        note: '瑞幸',
        confidence: 0.85,
        icon: '☕',
        reason: '咖啡时间'
      });
    }

    // 晚餐时间
    if (hour >= 17 && hour <= 21) {
      suggestions.push({
        id: 'quick-dinner',
        title: '晚餐',
        description: isWeekend ? '周末晚餐' : '工作日晚餐',
        category: 'food',
        amount: 17.73,
        note: '晚饭',
        confidence: 0.9,
        icon: '🍙',
        reason: `${isWeekend ? '周末' : '工作日'}晚餐时间`
      });
    }

    // 晚高峰通勤
    if (!isWeekend && (hour >= 17 && hour <= 19)) {
      suggestions.push({
        id: 'quick-evening-commute',
        title: '晚高峰通勤',
        description: '地铁通行费用',
        category: 'transport',
        amount: 6.00,
        note: '地铁通行费用',
        confidence: 0.85,
        icon: '🚇',
        reason: '工作日晚高峰通勤时间'
      });
    }

    return suggestions;
  }

  /**
   * 生成基于消费模式的快速建议
   */
  private generatePatternBasedQuickSuggestions(timeContext: any): QuickTransactionSuggestion[] {
    const suggestions: QuickTransactionSuggestion[] = [];

    // 高频消费模式
    const highFrequencyPatterns = [
      {
        id: 'quick-subway',
        title: '地铁',
        description: '日常通勤',
        category: 'transport',
        amount: 6.00,
        note: '地铁通行费用',
        confidence: 0.9,
        icon: '🚇',
        reason: '日常通勤高频消费'
      },
      {
        id: 'quick-luckin',
        title: '瑞幸咖啡',
        description: '日常提神',
        category: 'drink',
        amount: 12.90,
        note: '瑞幸',
        confidence: 0.85,
        icon: '☕',
        reason: '高频咖啡消费'
      }
    ];

    suggestions.push(...highFrequencyPatterns);
    return suggestions;
  }

  /**
   * 分析最近交易模式
   */
  private analyzeRecentTransactions(recentTransactions: any[]): {
    frequentCategory?: string;
    avgAmount: number;
    patterns: string[];
  } {
    const categoryCount: Record<string, number> = {};
    let totalAmount = 0;
    const patterns: string[] = [];

    recentTransactions.forEach(transaction => {
      categoryCount[transaction.category] = (categoryCount[transaction.category] || 0) + 1;
      totalAmount += transaction.amount;
    });

    const frequentCategory = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    const avgAmount = totalAmount / recentTransactions.length;

    return {
      frequentCategory,
      avgAmount,
      patterns
    };
  }

  /**
   * 计算中位数
   */
  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * 缓存管理
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * 清理缓存
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

// 导出单例实例
export const aiPredictionService = AIPredictionService.getInstance();