import Link from 'next/link';
import type { Route } from 'next';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

type SettingsActionTone = 'blue' | 'purple' | 'green' | 'orange' | 'gray';

export interface SettingsActionItem {
  title: string;
  icon: LucideIcon;
  status?: 'available' | 'coming-soon';
  href?: string;
  description?: string;
  tone?: SettingsActionTone;
}

interface SettingsActionGridProps {
  items: readonly SettingsActionItem[];
  columnsClassName?: string;
}

const ACTION_TONE_STYLES = {
  blue: 'text-blue-600 dark:text-blue-400',
  purple: 'text-purple-600 dark:text-purple-400',
  green: 'text-green-600 dark:text-green-400',
  orange: 'text-orange-600 dark:text-orange-400',
  gray: 'text-gray-400 dark:text-gray-500',
} as const;

export function SettingsActionGrid({
  items,
  columnsClassName = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
}: SettingsActionGridProps) {
  return (
    <div className={columnsClassName}>
      {items.map((item) => {
        const Icon = item.icon;
        const tone = item.status === 'available' ? item.tone || 'blue' : 'gray';
        const content = (
          <Button
            variant="outline"
            disabled={item.status !== 'available'}
            className="w-full h-auto p-4 flex flex-col items-center gap-2"
          >
            <Icon className={`h-8 w-8 ${ACTION_TONE_STYLES[tone]}`} />
            <span className="text-sm">{item.title}</span>
            {item.description && (
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {item.description}
              </span>
            )}
          </Button>
        );

        if (item.status === 'available' && item.href) {
          return (
            <Link key={item.title} href={item.href as Route}>
              {content}
            </Link>
          );
        }

        return <div key={item.title}>{content}</div>;
      })}
    </div>
  );
}
