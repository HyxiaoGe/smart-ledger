'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/helpers';
import NProgress from 'nprogress';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/add', label: '添加账单', icon: '➕' },
  { href: '/records', label: '账单列表', icon: '📋' },
  { href: '/settings', label: '设置', icon: '⚙️' }
];

export default function Navigation() {
  const pathname = usePathname();

  const handleClick = (href: string) => {
    // 只有在跳转到不同页面时才显示进度条
    if (pathname !== href && !pathname.startsWith(href === '/settings' ? '/settings' : '___')) {
      NProgress.start();
    }
  };

  return (
    <nav className="flex items-center gap-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href === '/settings' && pathname.startsWith('/settings'));

        return (
          <Link
            key={item.href}
            href={item.href as any}
            prefetch={true}
            onClick={() => handleClick(item.href)}
            className={cn(
              'relative px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg group',
              isActive
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-sm'
            )}
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </span>

            {/* 选中状态指示器 */}
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                <div className="w-8 h-1 bg-white rounded-full"></div>
              </div>
            )}

            {/* 悬停效果 */}
            <div
              className={cn(
                'absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-200',
                isActive && 'hidden'
              )}
            />
          </Link>
        );
      })}
      <div className="ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
        <ThemeToggle />
      </div>
    </nav>
  );
}
