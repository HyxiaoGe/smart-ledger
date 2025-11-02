/**
 * AIAnalysisPanel 常量定义
 * 提取常量避免每次渲染时重复创建对象
 */

/**
 * 类别名称中文翻译
 */
export const CATEGORY_NAMES: Record<string, string> = {
  food: '餐饮',
  transport: '交通',
  drink: '饮品',
  daily: '日用品',
  subscription: '订阅服务',
  entertainment: '娱乐',
  medical: '医疗',
  education: '教育',
  rent: '房租',
  other: '其他',
  shopping: '购物',
  utilities: '水电费'
} as const;

/**
 * 类别图标映射
 */
export const CATEGORY_ICONS: Record<string, string> = {
  food: '🍽️',
  transport: '🚇',
  drink: '☕',
  daily: '🛍️',
  subscription: '📱',
  entertainment: '🎮',
  medical: '💊',
  education: '📚',
  rent: '🏠',
  other: '📦',
  shopping: '🛒',
  utilities: '💡',
  salary: '💰',
  bonus: '🎁',
  investment: '📈'
} as const;

/**
 * 优先级配置
 */
export const PRIORITY_CONFIG = {
  high: {
    label: '高优先级',
    className: 'bg-red-100 text-red-700'
  },
  medium: {
    label: '中优先级',
    className: 'bg-yellow-100 text-yellow-700'
  },
  low: {
    label: '低优先级',
    className: 'bg-gray-100 text-gray-700'
  }
} as const;

/**
 * 类别特定的优化建议配置
 */
export const CATEGORY_OPTIMIZATION_CONFIG = {
  food: {
    highFrequencyThreshold: 10,
    highAmountThreshold: 50,
    savingsRate: {
      high: 0.25,
      medium: 0.15
    }
  },
  transport: {
    highFrequencyThreshold: 15,
    savingsRate: {
      high: 0.2,
      medium: 0.1
    }
  },
  shopping: {
    savingsRate: 0.3
  },
  entertainment: {
    savingsRate: 0.4
  },
  drink: {
    highFrequencyThreshold: 10,
    highAmountThreshold: 15,
    savingsRate: 0.5
  }
} as const;
