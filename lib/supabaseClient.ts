// Supabase 客户端初始化（仅在浏览器和 Edge/Node 运行时使用）
// 注意：不在此文件写入密钥，使用匿名公开密钥；服务端密钥请放在安全后端环境。

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be provided');
}

export const supabase = createClient(url, anonKey, {
  global: {
    fetch: (input: any, init?: RequestInit) => {
      return fetch(input, { ...(init || {}), cache: 'no-store' });
    }
  }
});
