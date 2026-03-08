import { cn } from '@/lib/utils/helpers';
import { LucideIcon } from 'lucide-react';
import React from 'react';

type EmptyStateProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  iconClassName?: string;
};

export function EmptyState({
  title = '暂无数据',
  description,
  action,
  className,
  icon: Icon,
  iconClassName
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-6 py-8 text-center text-sm text-muted-foreground shadow-sm sm:px-8 sm:py-10 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]',
        className
      )}
    >
      {Icon && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <Icon className={cn('h-6 w-6 text-muted-foreground', iconClassName)} />
        </div>
      )}
      <div className="space-y-1.5">
        <div className="text-base font-semibold tracking-tight text-foreground">{title}</div>
        {description && (
          <div className="max-w-md leading-6 text-muted-foreground">{description}</div>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
