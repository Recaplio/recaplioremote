import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Use ANON_KEY for user-centric server client
    {
      cookies: {
        get(name: string) {
          // @ts-expect-error Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'.
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // @ts-expect-error Property 'set' does not exist on type 'Promise<ReadonlyRequestCookies>'.
            cookieStore.set({ name, value, ...options });
          } catch (_error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn(`[SupabaseServerClient] Error setting cookie ${name}:`, _error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // @ts-expect-error Property 'set' does not exist on type 'Promise<ReadonlyRequestCookies>'.
            cookieStore.set({ name, value: '', ...options });
          } catch (_error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn(`[SupabaseServerClient] Error removing cookie ${name}:`, _error);
          }
        },
      },
      auth: {
        // autoRefreshToken: false, // Default is true, which is usually desired for sessions
        // persistSession: true, // Default is true
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