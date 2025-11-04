import { PageSkeleton } from '@/components/shared/PageSkeleton';

export default function Loading() {
  return <PageSkeleton showBackButton={false} stats={2} listItems={4} />;
}
