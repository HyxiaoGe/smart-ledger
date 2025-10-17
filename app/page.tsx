// 首页：使用客户端组件实现快速加载
import HomePageClient from './page-client';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return <HomePageClient />;
}
