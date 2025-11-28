'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
};

export function Breadcrumb({ items, className, showHome = true }: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: '首页', href: '/' }, ...items]
    : items;

  return (
    <nav
      aria-label="面包屑导航"
      className={cn('flex items-center text-sm text-muted-foreground', className)}
    >
      <ol className="flex items-center gap-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isHome = index === 0 && showHome;

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1 hover:text-foreground transition-colors',
                    isHome && 'text-muted-foreground'
                  )}
                >
                  {isHome && <Home className="h-4 w-4" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className={cn('flex items-center gap-1', isLast && 'text-foreground font-medium')}>
                  {isHome && <Home className="h-4 w-4" />}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
