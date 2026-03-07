import type { LucideIcon } from 'lucide-react';

type SettingsInfoTone = 'blue' | 'purple' | 'green' | 'orange';

interface SettingsInfoPanelProps {
  title: string;
  description: string;
  icon: LucideIcon;
  tone?: SettingsInfoTone;
  className?: string;
}

const TONE_STYLES = {
  blue: {
    wrapper: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
    iconWrapper: 'bg-blue-100 dark:bg-blue-900',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    text: 'text-blue-700 dark:text-blue-300',
  },
  purple: {
    wrapper: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
    iconWrapper: 'bg-purple-100 dark:bg-purple-900',
    icon: 'text-purple-600 dark:text-purple-400',
    title: 'text-purple-900 dark:text-purple-100',
    text: 'text-purple-700 dark:text-purple-300',
  },
  green: {
    wrapper: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
    iconWrapper: 'bg-green-100 dark:bg-green-900',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-900 dark:text-green-100',
    text: 'text-green-700 dark:text-green-300',
  },
  orange: {
    wrapper: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
    iconWrapper: 'bg-orange-100 dark:bg-orange-900',
    icon: 'text-orange-600 dark:text-orange-400',
    title: 'text-orange-900 dark:text-orange-100',
    text: 'text-orange-700 dark:text-orange-300',
  },
} as const;

export function SettingsInfoPanel({
  title,
  description,
  icon: Icon,
  tone = 'blue',
  className = 'mt-8',
}: SettingsInfoPanelProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <div className={`${className} p-4 rounded-lg border ${toneStyle.wrapper}`.trim()}>
      <div className="flex items-start gap-3">
        <div className={`p-1 rounded ${toneStyle.iconWrapper}`}>
          <Icon className={`h-4 w-4 ${toneStyle.icon}`} />
        </div>
        <div className={`text-sm ${toneStyle.title}`}>
          <p className="font-medium mb-1">{title}</p>
          <p className={toneStyle.text}>{description}</p>
        </div>
      </div>
    </div>
  );
}
