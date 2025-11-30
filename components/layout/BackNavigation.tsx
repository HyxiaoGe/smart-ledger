'use client';

import React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import NProgress from 'nprogress';

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
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200',
    subtle: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200',
    primary: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md rounded-lg px-3 py-2 transition-all duration-200'
  };

  const handleClick = () => {
    NProgress.start();
  };

  return (
    <div className={`mb-6 ${className}`}>
      <Link href={href as Route} prefetch={true} onClick={handleClick}>
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