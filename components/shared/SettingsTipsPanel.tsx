import type { ReactNode } from 'react';

type SettingsTipsTone = 'blue' | 'purple' | 'green' | 'orange';

interface SettingsTipsPanelProps {
  title: string;
  items: readonly ReactNode[];
  tone?: SettingsTipsTone;
}

const TONE_STYLES = {
  blue: {
    wrapper: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
    title: 'text-blue-900 dark:text-blue-100',
    text: 'text-blue-800 dark:text-blue-200',
  },
  purple: {
    wrapper: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
    title: 'text-purple-900 dark:text-purple-100',
    text: 'text-purple-800 dark:text-purple-200',
  },
  green: {
    wrapper: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
    title: 'text-green-900 dark:text-green-100',
    text: 'text-green-800 dark:text-green-200',
  },
  orange: {
    wrapper: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
    title: 'text-orange-900 dark:text-orange-100',
    text: 'text-orange-800 dark:text-orange-200',
  },
} as const;

export function SettingsTipsPanel({
  title,
  items,
  tone = 'blue',
}: SettingsTipsPanelProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <div className={`mt-8 p-4 rounded-lg border ${toneStyle.wrapper}`}>
      <h3 className={`font-medium mb-2 ${toneStyle.title}`}>{title}</h3>
      <ul className={`text-sm space-y-1 ${toneStyle.text}`}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
