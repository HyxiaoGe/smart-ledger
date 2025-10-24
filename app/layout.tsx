import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import Navigation from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Smart Ledger',
  description: '智能记账'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-white text-foreground">
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
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
      </body>
    </html>
  );
}
