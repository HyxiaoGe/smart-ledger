import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface SettingsPageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  tone?: 'blue' | 'purple' | 'green' | 'orange' | 'gray';
  eyebrow?: string;
  aside?: ReactNode;
  className?: string;
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
  eyebrow,
  aside,
  className,
}: SettingsPageHeaderProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <div className={cn('mb-8', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-3 inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 backdrop-blur dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
              {eyebrow}
            </div>
          )}
          <div className="flex items-start gap-3">
            {Icon && (
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 shadow-sm ${toneStyle.container}`}
              >
                <Icon className={`h-5 w-5 ${toneStyle.icon}`} />
              </div>
            )}
            <div className="min-w-0 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-[1.75rem]">
                {title}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                {description}
              </p>
            </div>
          </div>
        </div>
        {aside ? <div className="shrink-0 sm:pt-1">{aside}</div> : null}
      </div>
    </div>
  );
}
