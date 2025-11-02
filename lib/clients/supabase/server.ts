import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

if (!url || !serviceKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be provided for server client'
  );
}

export const supabaseServerClient = createClient(url, serviceKey, {
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
