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
    default: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200',
    subtle: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200',
    primary: 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 hover:border-blue-300 hover:shadow-md rounded-lg px-3 py-2 transition-all duration-200'
  };

  return (
    <div className={`mb-6 ${className}`}>
      <Link href={href}>
        <Button
          variant="ghost"
          className={`group flex items-center gap-2 ${variants[variant]}`}
        >
          <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
          <span className="font-medium">{title}</span>
        </Button>
      </Link>
    </div>
  );
}