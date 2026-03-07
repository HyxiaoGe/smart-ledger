import Link from 'next/link';
import type { Route } from 'next';

import { ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface SettingsBackButtonProps {
  href?: string;
  label?: string;
}

export function SettingsBackButton({
  href = '/settings',
  label = '返回设置中心',
}: SettingsBackButtonProps) {
  return (
    <div className="mb-6">
      <Link href={href as Route}>
        <Button
          variant="ghost"
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </Link>
    </div>
  );
}
