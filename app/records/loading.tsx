import { SkeletonBlock, SkeletonGrid } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-9 w-40" />
      </div>
      <SkeletonGrid
        count={2}
        className="grid gap-4 md:grid-cols-2"
        itemClassName="h-32 w-full rounded-lg"
      />
      <div className="space-y-3">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-56 w-full rounded-lg" />
      </div>
    </div>
  );
}
