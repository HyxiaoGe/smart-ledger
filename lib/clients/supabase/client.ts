// Supabase 客户端初始化（仅在浏览器和 Edge/Node 运行时使用）
// 注意：不在此文件写入密钥，使用匿名公开密钥；服务端密钥请放在安全后端环境。

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// 在构建时使用占位符，运行时再检查
const supabaseUrl = url || 'https://placeholder.supabase.co';
const supabaseAnonKey = anonKey || 'placeholder-anon-key';

// 仅在运行时（非构建时）检查环境变量
if (typeof window !== 'undefined' && (!url || !anonKey)) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be provided');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (input: any, init?: RequestInit) => {
      return fetch(input, { ...(init || {}), cache: 'no-store' });
    }
  }
});
