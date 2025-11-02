import { cn } from '@/lib/utils/helpers';

type SkeletonBlockProps = {
  className?: string;
};

type SkeletonGridProps = {
  count: number;
  className?: string;
  itemClassName?: string;
};

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function SkeletonGrid({ count, className, itemClassName }: SkeletonGridProps) {
  return (
    <div className={cn('grid gap-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock key={index} className={itemClassName} />
      ))}
    </div>
  );
}
