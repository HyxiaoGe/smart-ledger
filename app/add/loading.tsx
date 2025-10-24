import { SkeletonBlock, SkeletonGrid } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-10 w-32" />
      <div className="space-y-4 rounded-lg bg-card p-6 shadow-sm">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-9 w-full" />
        <SkeletonGrid count={2} className="grid gap-4 md:grid-cols-2" itemClassName="h-9 w-full" />
        <SkeletonBlock className="h-40 w-full" />
        <SkeletonBlock className="h-10 w-full" />
      </div>
    </div>
  );
}
