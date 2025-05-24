import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies as getCookies } from 'next/headers';

export function createSupabaseServerClient() {
  // const cookieStore = cookies(); // Deferred to inside methods

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Use ANON_KEY for user-centric server client
    {
      cookies: {
        get: async (name: string) => {
          const cookieStore = await getCookies();
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set: async (name: string, value: string, options: CookieOptions) => {
          try {
            const cookieStore = await getCookies();
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            // console.warn(`[SupabaseServerClient] Error setting cookie ${name}:`, _error); // Silencing for now
          }
        },
        remove: async (name: string, options: CookieOptions) => {
          try {
            const cookieStore = await getCookies();
            cookieStore.set({ name, value: '', ...options }); // Supabase uses set empty to remove
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            // console.warn(`[SupabaseServerClient] Error removing cookie ${name}:`, _error); // Silencing for now
          }
        },
      },
      auth: {
        // autoRefreshToken: false, 
        // persistSession: true, 
      }
    }
  );
}

// Dedicated client for admin/backend tasks that should always use the service role key
// and does not need to manage user sessions via cookies.
export function createSupabaseAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL or Service Role Key is not defined for Admin Client');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}