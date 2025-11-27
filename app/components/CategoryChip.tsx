'use client';

import { useCategories } from '@/contexts/CategoryContext';
import { Badge } from '@/components/ui/badge';

export function CategoryChip({ category }: { category: string }) {
  const { getCategoryMeta } = useCategories();
  const meta = getCategoryMeta(category);

  return (
    <Badge variant="outline" style={{ borderColor: meta.color, color: meta.color }}>
      <span className="mr-1" aria-hidden>
        {meta.icon}
      </span>
      {meta.label}
    </Badge>
  );
}
