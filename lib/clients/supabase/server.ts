import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

// 在构建时使用占位符，运行时再检查
const supabaseUrl = url || 'https://placeholder.supabase.co';
const supabaseServiceKey = serviceKey || 'placeholder-service-key';

// 仅在服务端运行时（非构建时）检查环境变量
if (process.env.NODE_ENV !== 'production' || (typeof window === 'undefined' && process.env.VERCEL)) {
  if (!url || !serviceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be provided for server client');
  }
}

export const supabaseServerClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    fetch: (input: RequestInfo, init?: RequestInit) =>
      fetch(input, {
        ...(init || {}),
        cache: 'no-store'
      })
  }
});
