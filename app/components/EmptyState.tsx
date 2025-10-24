import React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title = '��������',
  description,
  action,
  className
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border p-8 text-center text-sm text-muted-foreground',
        className
      )}
    >
      <div className="text-base font-medium text-foreground">{title}</div>
      {description ? <div>{description}</div> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
