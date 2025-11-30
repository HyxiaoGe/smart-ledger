import type { QuickTransactionItem } from './types';

// 基于历史数据的快速记账项目
export const QUICK_ITEMS: QuickTransactionItem[] = [
  {
    id: 'subway',
    title: '地铁通勤',
    icon: '🚇',
    category: 'transport',
    fixedAmount: 6.00,
    isFixed: true
  },
  {
    id: 'lunch',
    title: '午餐',
    icon: '🍱',
    category: 'food',
    suggestedAmount: 16.82,
    isFixed: false
  },
  {
    id: 'dinner',
    title: '晚餐',
    icon: '🍙',
    category: 'food',
    suggestedAmount: 17.73,
    isFixed: false
  },
  {
    id: 'coffee',
    title: '瑞幸咖啡',
    icon: '☕',
    category: 'drink',
    suggestedAmount: 12.90,
    isFixed: false
  },
  {
    id: 'bread',
    title: '面包',
    icon: '🥖',
    category: 'daily',
    suggestedAmount: 14.90,
    isFixed: false
  },
  {
    id: 'subscription',
    title: 'AI订阅',
    icon: '📱',
    category: 'subscription',
    suggestedAmount: 16.53,
    isFixed: false
  }
];

// 分类显示配置
export const CATEGORY_DISPLAY: Record<string, { color: string; label: string }> = {
  transport: { color: 'text-green-600', label: '🚇 通勤' },
  food: { color: 'text-orange-600', label: '🍽️ 餐饮' },
  drink: { color: 'text-blue-600', label: '☕ 饮品' },
  daily: { color: 'text-purple-600', label: '🛍️ 日用品' },
  subscription: { color: 'text-gray-600', label: '📱 订阅' },
};

// 匹配关键词
export const ITEM_KEYWORDS: Record<string, string[]> = {
  'lunch': ['午餐', '午饭', '午饭'],
  'dinner': ['晚餐', '晚饭', '晚餐'],
  'subway': ['地铁', '通勤', '地铁'],
  'coffee': ['咖啡', '瑞幸', '咖啡'],
  'bread': ['面包', '烘焙', '面包'],
  'subscription': ['订阅', '会员', '订阅']
};
