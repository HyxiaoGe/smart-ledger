import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings2, Clock as ClockIcon } from 'lucide-react';

type SettingsFeatureStatus = 'available' | 'coming-soon';
type SettingsFeatureTone = 'blue' | 'purple' | 'green' | 'gray';

export interface SettingsFeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
  status: SettingsFeatureStatus;
  href?: string;
  badge?: string;
  badgeTone?: SettingsFeatureTone;
  badgeColor?: SettingsFeatureTone;
}

interface SettingsFeatureGridProps {
  items: readonly SettingsFeatureItem[];
  accentTone?: Exclude<SettingsFeatureTone, 'gray'>;
  columnsClassName?: string;
  availableActionLabel?: string;
  comingSoonActionLabel?: string;
}

const AVAILABLE_TONE_STYLES = {
  blue: {
    iconContainer: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonClassName: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600',
  },
  purple: {
    iconContainer: 'bg-purple-100 dark:bg-purple-900',
    iconColor: 'text-purple-600 dark:text-purple-400',
    buttonClassName:
      'bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600',
  },
  green: {
    iconContainer: 'bg-green-100 dark:bg-green-900',
    iconColor: 'text-green-600 dark:text-green-400',
    buttonClassName: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600',
  },
} as const;

const BADGE_TONE_STYLES = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
} as const;

const UNAVAILABLE_ICON_CONTAINER = 'bg-gray-100 dark:bg-gray-800';
const UNAVAILABLE_ICON_COLOR = 'text-gray-400 dark:text-gray-400';

export function SettingsFeatureGrid({
  items,
  accentTone = 'blue',
  columnsClassName = 'grid grid-cols-1 md:grid-cols-2 gap-6',
  availableActionLabel = '开始配置',
  comingSoonActionLabel = '敬请期待',
}: SettingsFeatureGridProps) {
  const availableToneStyle = AVAILABLE_TONE_STYLES[accentTone];

  return (
    <div className={columnsClassName}>
      {items.map((item) => {
        const Icon = item.icon;
        const iconContainerClassName =
          item.status === 'available'
            ? availableToneStyle.iconContainer
            : UNAVAILABLE_ICON_CONTAINER;
        const iconClassName =
          item.status === 'available' ? availableToneStyle.iconColor : UNAVAILABLE_ICON_COLOR;
        const badgeClassName = item.badge
          ? BADGE_TONE_STYLES[item.badgeTone || item.badgeColor || 'gray']
          : null;

        return (
          <Card key={item.title} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${iconContainerClassName}`}>
                    <Icon className={`h-6 w-6 ${iconClassName}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    {item.badge && badgeClassName && (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${badgeClassName}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
                {item.description}
              </p>
              {item.status === 'available' && item.href ? (
                <Link href={item.href}>
                  <Button className={`w-full ${availableToneStyle.buttonClassName}`}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    {availableActionLabel}
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" disabled className="w-full">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  {comingSoonActionLabel}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
