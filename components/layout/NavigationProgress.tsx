'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';
import '../../app/nprogress.css';

// 配置 NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 100,
  minimum: 0.2
});

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 路由开始变化时显示进度条
    NProgress.start();

    // 路由变化完成后关闭进度条
    NProgress.done();

    return () => {
      NProgress.done();
    };
  }, [pathname, searchParams]);

  return null;
}
