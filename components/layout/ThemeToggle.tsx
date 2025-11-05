'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免 SSR 闪烁
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg"
        disabled
      >
        <div className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-yellow-500 transition-transform hover:rotate-180 duration-500" />
      ) : (
        <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300 transition-transform hover:-rotate-12 duration-300" />
      )}
    </Button>
  );
}
