import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface BackNavigationProps {
  href: string;
  title: string;
  variant?: 'default' | 'subtle' | 'primary';
  className?: string;
}

export function BackNavigation({
  href,
  title,
  variant = 'subtle',
  className = ''
}: BackNavigationProps) {
  const variants = {
    default: 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 shadow-sm',
    subtle: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
    primary: 'bg-blue-600 text-white hover:bg-blue-700'
  };

  return (
    <div className={`mb-6 ${className}`}>
      <Link href={href}>
        <Button
          variant="ghost"
          className={`group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${variants[variant]}`}
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">{title}</span>
        </Button>
      </Link>
    </div>
  );
}