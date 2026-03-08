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
        align === 'between'
          ? 'flex-col items-start justify-between sm:flex-row sm:items-end'
          : 'flex-col',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400">
            {eyebrow}
          </div>
        )}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[1.15rem]">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {aside ? <div className="w-full shrink-0 sm:w-auto">{aside}</div> : null}
    </div>
  );
}
