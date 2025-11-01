// 基于真实历史数据的智能模式识别

export interface ConsumptionPattern {
  category: string;
  amountRange: { min: number; max: number };
  typicalNotes: string[];
  confidence: number;
  timePatterns?: string[];
  pricePoints?: number[];
}

/**
 * 基于历史数据分析得出的消费模式
 */
export const CONSUMPTION_PATTERNS: ConsumptionPattern[] = [
  {
    category: 'drink',
    amountRange: { min: 9.0, max: 13.5 },
    typicalNotes: ['瑞幸', '瑞幸咖啡', '瑞幸椰子水'],
    confidence: 0.95, // 高度置信的模式
    pricePoints: [9.90, 12.90, 12.48],
    timePatterns: ['早晨', '上午']
  },
  {
    category: 'transport',
    amountRange: { min: 5.5, max: 6.5 },
    typicalNotes: ['地铁通行费用', '地铁通勤', '地铁', '地铁来回通勤'],
    confidence: 0.90,
    pricePoints: [6.00],
    timePatterns: ['上班时间', '下班时间']
  },
  {
    category: 'food',
    amountRange: { min: 13.0, max: 22.0 },
    typicalNotes: ['午饭', '美团外卖（午饭）', '午饭费'],
    confidence: 0.85,
    pricePoints: [15.00, 14.00, 17.00],
    timePatterns: ['午餐时间', '午休时间']
  },
  {
    category: 'food',
    amountRange: { min: 14.0, max: 22.0 },
    typicalNotes: ['晚饭', '美团外卖（晚饭）', '晚饭'],
    confidence: 0.80,
    pricePoints: [17.00, 18.00, 19.00],
    timePatterns: ['晚餐时间', '晚间']
  },
  {
    category: 'subscription',
    amountRange: { min: 14.0, max: 25.0 },
    typicalNotes: ['AI订阅费用', 'cursor api', 'glm-4.6订阅'],
    confidence: 0.88,
    pricePoints: [14.28, 18.50, 5.32, 20.00]
  },
  {
    category: 'daily',
    amountRange: { min: 10.0, max: 15.0 },
    typicalNotes: ['面包'],
    confidence: 0.75,
    pricePoints: [12.50, 14.80, 19.80]
  }
];

/**
 * 检查输入是否匹配某个消费模式
 */
export function matchConsumptionPattern(
  category: string,
  amount: number
): ConsumptionPattern | null {
  return CONSUMPTION_PATTERNS.find(pattern => {
    return pattern.category === category &&
           amount >= pattern.amountRange.min &&
           amount <= pattern.amountRange.max;
  }) || null;
}

/**
 * 获取匹配模式的智能建议
 */
export function getPatternBasedSuggestions(
  category: string,
  amount: number,
  timeContext?: string
): Array<{ note: string; confidence: number; reason: string }> {
  const pattern = matchConsumptionPattern(category, amount);
  if (!pattern) return [];

  const suggestions: Array<{ note: string; confidence: number; reason: string }> = [];

  // 基于典型金额的精确匹配
  if (pattern.pricePoints) {
    const closestPricePoint = pattern.pricePoints.reduce((prev, curr) => {
      return Math.abs(curr - amount) < Math.abs(prev - amount) ? curr : prev;
    });

    const priceDiff = Math.abs(closestPricePoint - amount);
    if (priceDiff <= 0.5) { // 价格差异在0.5元以内
      // 找到这个价格点对应的最常用备注
      const pricePointNotes = getNotesForPricePoint(pattern, closestPricePoint, timeContext);
      pricePointNotes.forEach(note => {
        suggestions.push({
          note,
          confidence: pattern.confidence * 0.95, // 非常高的置信度
          reason: `金额精确匹配历史模式 (¥${closestPricePoint})`
        });
      });
    }
  }

  // 基于类别的通用建议
  pattern.typicalNotes.forEach(note => {
    const existingSuggestion = suggestions.find(s => s.note === note);
    if (!existingSuggestion) {
      suggestions.push({
        note,
        confidence: pattern.confidence * 0.8,
        reason: `基于${pattern.category}类别的消费模式 (¥${amount.toFixed(2)})`
      });
    }
  });

  return suggestions;
}

/**
 * 获取特定价格点对应的最常用备注
 */
function getNotesForPricePoint(pattern: ConsumptionPattern, pricePoint: number, timeContext?: string): string[] {
  // 这里可以进一步细化，基于价格点匹配特定备注
  // 例如：9.90元对应基础瑞幸，12.90元对应加料瑞幸
  switch (pattern.category) {
    case 'drink':
      if (Math.abs(pricePoint - 9.90) < 0.1) {
        return ['瑞幸', '瑞幸咖啡'];
      } else if (Math.abs(pricePoint - 12.90) < 0.1) {
        return ['瑞幸'];
      } else if (Math.abs(pricePoint - 12.48) < 0.1) {
        return ['瑞幸椰子水'];
      }
      break;
    case 'transport':
      if (Math.abs(pricePoint - 6.00) < 0.1) {
        return ['地铁通行费用', '地铁通勤'];
      }
      break;
    case 'food':
      if (timeContext?.includes('午餐') || timeContext?.includes('午饭')) {
        return ['午饭', '美团外卖（午饭）'];
      } else if (timeContext?.includes('晚餐') || timeContext?.includes('晚饭')) {
        return ['晚饭', '美团外卖（晚饭）'];
      }
      break;
  }

  return pattern.typicalNotes;
}

/**
 * 获取用户历史消费的统计信息
 */
export function getConsumptionStats(category: string, amount: number): {
  typicalAmount: number;
  frequency: 'high' | 'medium' | 'low';
  lastUsed: string | null;
} {
  const pattern = matchConsumptionPattern(category, amount);

  if (!pattern) {
    return {
      typicalAmount: amount,
      frequency: 'low',
      lastUsed: null
    };
  }

  // 基于置信度判断使用频率
  const frequency = pattern.confidence >= 0.9 ? 'high' :
                    pattern.confidence >= 0.8 ? 'medium' : 'low';

  return {
    typicalAmount: (pattern.amountRange.min + pattern.amountRange.max) / 2,
    frequency,
    lastUsed: null // 可以从数据库中获取最后使用时间
  };
}