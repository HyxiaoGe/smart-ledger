import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/helpers';

interface SectionIntroProps {
  title: string;
  description?: string;
  eyebrow?: string;
  className?: string;
  align?: 'left' | 'between';
  aside?: ReactNode;
}

export function SectionIntro({
  title,
  description,
  eyebrow,
  className,
  align = 'left',
  aside,
}: SectionIntroProps) {
  return (
    <div
      className={cn(
        'flex gap-4',
        align === 'between' ? 'items-end justify-between' : 'flex-col',
        className
      )}
    >
      <div>
        {eyebrow && (
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            {eyebrow}
          </div>
        )}
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
