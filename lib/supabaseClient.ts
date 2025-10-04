// Supabase 客户端初始化（仅在浏览器和 Edge/Node 运行时使用）
// 注意：不在此文件写入密钥，使用匿名公开密钥；服务端密钥请放在安全后端环境。

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // 在开发阶段以 console.warn 提示，方便本地调试
  console.warn('[supabase] 缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  global: {
    fetch: (input: RequestInfo, init?: RequestInit) => {
      return fetch(input as any, { ...(init || {}), cache: 'no-store' });
    }
  }
});
