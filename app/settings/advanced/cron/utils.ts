import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Database,
  type LucideIcon,
  Settings,
  Sparkles,
  XCircle,
} from 'lucide-react';

export interface CronCategoryStyle {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

export interface CronStatusStyle {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  label: string;
}

export const CRON_CATEGORY_STYLES: Record<string, CronCategoryStyle> = {
  business: {
    icon: Database,
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  ai: {
    icon: Sparkles,
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  maintenance: {
    icon: Settings,
    bgColor: 'bg-green-50 dark:bg-green-950',
    iconColor: 'text-green-600',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  default: {
    icon: Cpu,
    bgColor: 'bg-gray-50 dark:bg-gray-900',
    iconColor: 'text-gray-600',
    borderColor: 'border-gray-200 dark:border-gray-700',
  },
};

export const CRON_STATUS_STYLES: Record<string, CronStatusStyle> = {
  succeeded: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
    label: '成功',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    label: '失败',
  },
  running: {
    icon: Activity,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    label: '运行中',
  },
  default: {
    icon: AlertCircle,
    color: 'text-gray-600',
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-gray-200 dark:border-gray-700',
    label: '未知',
  },
};

export function getCronCategoryStyle(category: string): CronCategoryStyle {
  return CRON_CATEGORY_STYLES[category] || CRON_CATEGORY_STYLES.default;
}

export function getCronStatusStyle(status: string): CronStatusStyle {
  return CRON_STATUS_STYLES[status] || CRON_STATUS_STYLES.default;
}
