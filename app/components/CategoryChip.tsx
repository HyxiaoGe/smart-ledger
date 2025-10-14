import { PRESET_CATEGORIES } from '@/lib/config';
import { Badge } from '@/components/ui/badge';

export function CategoryChip({ category }: { category: string }) {
  const meta = PRESET_CATEGORIES.find((c) => c.key === category);
  const label = meta?.label || category;
  const icon = meta?.icon || '';
  const color = meta?.color || '#6B7280';
  return (
    <Badge variant="outline" style={{ borderColor: color, color }}>
      <span className="mr-1" aria-hidden>{icon}</span>
      {label}
    </Badge>
  );
}

