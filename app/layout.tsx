import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import Navigation from '@/components/layout/Navigation';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { NavigationProgress } from '@/components/layout/NavigationProgress';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { GlobalErrorHandler } from '@/components/layout/GlobalErrorHandler';
import { SyncNotificationProvider } from '@/components/shared/SyncNotificationProvider';
import { ToastProvider } from '@/components/ui/toast';
import { CategoryProvider } from '@/contexts/CategoryContext';
import { QueryProvider } from '@/lib/api/QueryProvider';

export const metadata: Metadata = {
  title: 'Smart Ledger',
  description: '智能记账'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 text-foreground transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <CategoryProvider>
              <ToastProvider>
              <GlobalErrorHandler />
              <NavigationProgress />
              <SyncNotificationProvider />
              <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
                <div className="container flex h-16 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link
                      href="/"
                      className="flex items-center gap-2 font-bold text-xl bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent hover:scale-105 transition-transform"
                    >
                      <span className="text-2xl">💰</span>
                      <span>Smart Ledger</span>
                    </Link>
                  </div>
                  <Navigation />
                </div>
              </header>
              <main className="container py-6">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
              </ToastProvider>
            </CategoryProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
