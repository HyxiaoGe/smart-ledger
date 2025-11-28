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
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center text-sm text-muted-foreground', className)}>
      {Icon && (
        <div className="rounded-full bg-muted p-3">
          <Icon className={cn('h-6 w-6 text-muted-foreground', iconClassName)} />
        </div>
      )}
      <div className="space-y-1">
        <div className="text-base font-medium text-foreground">{title}</div>
        {description && <div className="text-muted-foreground">{description}</div>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

