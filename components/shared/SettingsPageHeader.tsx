import type { LucideIcon } from 'lucide-react';

interface SettingsPageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  tone?: 'blue' | 'purple' | 'green' | 'orange' | 'gray';
}

const TONE_STYLES = {
  blue: {
    container: 'bg-blue-100 dark:bg-blue-900',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    container: 'bg-purple-100 dark:bg-purple-900',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  green: {
    container: 'bg-green-100 dark:bg-green-900',
    icon: 'text-green-600 dark:text-green-400',
  },
  orange: {
    container: 'bg-orange-100 dark:bg-orange-900',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  gray: {
    container: 'bg-gray-100 dark:bg-gray-800',
    icon: 'text-gray-600 dark:text-gray-300',
  },
} as const;

export function SettingsPageHeader({
  title,
  description,
  icon: Icon,
  tone = 'blue',
}: SettingsPageHeaderProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {Icon && (
          <div className={`p-2 rounded-lg ${toneStyle.container}`}>
            <Icon className={`h-6 w-6 ${toneStyle.icon}`} />
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
