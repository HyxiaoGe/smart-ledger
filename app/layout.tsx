// 应用根布局（中文注释）
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Ledger',
  description: '智能记账 MVP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground">
        <header className="border-b">
          <div className="container flex h-14 items-center gap-4">
            <a className="font-semibold" href="/">Smart Ledger</a>
            <nav className="flex items-center gap-3 text-sm">
              <a className="text-muted-foreground hover:text-foreground" href="/">首页</a>
              <a className="text-muted-foreground hover:text-foreground" href="/add">添加账单</a>
              <a className="text-muted-foreground hover:text-foreground" href="/records">账单列表</a>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  );
}
