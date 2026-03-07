import {
  BarChart3,
  Database,
  type LucideIcon,
  Settings,
  Sparkles,
} from 'lucide-react';

import type { FunctionInfo } from '@/lib/services/functionService';

export interface FunctionCategoryConfig {
  title: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  badgeClassName: string;
}

export const FUNCTION_CATEGORY_CONFIG: Record<FunctionInfo['category'], FunctionCategoryConfig> = {
  business: {
    title: '核心业务功能',
    shortLabel: '业务',
    description: '增删改操作',
    icon: Database,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeClassName: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  },
  query: {
    title: '数据查询分析',
    shortLabel: '查询',
    description: '统计和报表',
    icon: BarChart3,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    badgeClassName: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  },
  ai: {
    title: 'AI 智能助手',
    shortLabel: 'AI',
    description: '预测和建议',
    icon: Sparkles,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    borderColor: 'border-purple-200 dark:border-purple-800',
    badgeClassName: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
  },
  maintenance: {
    title: '系统维护',
    shortLabel: '维护',
    description: '维护和监控',
    icon: Settings,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
    badgeClassName: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
  },
};

export function getFunctionCategoryConfig(category: FunctionInfo['category']) {
  return FUNCTION_CATEGORY_CONFIG[category];
}
