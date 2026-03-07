import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SettingsCalloutTone = 'blue' | 'purple' | 'green' | 'orange' | 'red';

interface SettingsCalloutCardProps {
  title: string;
  icon?: LucideIcon;
  tone?: SettingsCalloutTone;
  children: ReactNode;
  className?: string;
}

const TONE_STYLES = {
  blue: {
    card: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800',
    title: 'text-blue-900 dark:text-blue-100',
  },
  purple: {
    card: 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800',
    title: 'text-purple-900 dark:text-purple-300',
  },
  green: {
    card: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800',
    title: 'text-green-900 dark:text-green-100',
  },
  orange: {
    card: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800',
    title: 'text-orange-900 dark:text-orange-300',
  },
  red: {
    card: 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800',
    title: 'text-red-900 dark:text-red-300',
  },
} as const;

export function SettingsCalloutCard({
  title,
  icon: Icon,
  tone = 'blue',
  children,
  className = '',
}: SettingsCalloutCardProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <Card className={`${toneStyle.card} ${className}`.trim()}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${toneStyle.title}`}>
          {Icon && <Icon className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
