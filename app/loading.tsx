import { PageSkeleton } from '@/components/shared/PageSkeleton';

export default function Loading() {
  return <PageSkeleton showBackButton={false} stats={3} listItems={4} />;
}
