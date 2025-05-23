import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  // This function is intended for use in Route Handlers, Server Actions, or Server Components
  // where `nextCookies()` is available.
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Using service role key for broader server-side capabilities
    {
      cookies: {
        get(name: string) {
          // @ts-expect-error Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'.
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // The `set` method is called by `createServerClient` to persist session data.
            // It might throw if called from a Server Component during static rendering.
            // Middleware should handle refreshing session cookies.
            // @ts-expect-error Property 'set' does not exist on type 'Promise<ReadonlyRequestCookies>'.
            cookieStore.set({ name, value, ...options });
          } catch (_error) {
            console.warn('Supabase server client: Failed to set cookie', _error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // The `delete` method is called by `createServerClient` (e.g., on sign out).
            // Similar to `set`, it might throw in certain contexts.
            // @ts-expect-error Property 'delete' does not exist on type 'Promise<ReadonlyRequestCookies>'.
            cookieStore.delete({ name, ...options });
          } catch (_error) {
            console.warn('Supabase server client: Failed to delete cookie', _error);
          }
        },
      },
      // It's generally recommended to use the service_role key for server-side operations
      // that need to bypass RLS or perform admin tasks, as we are doing here by using it.
      // If this client were specifically for user-session-bound operations only, 
      // you might use NEXT_PUBLIC_SUPABASE_ANON_KEY and rely on RLS.
      // However, for an API route performing data ingestion, service_role is appropriate.
      auth: {
        // autoRefreshToken: false, // Keep default or true for server client interacting with user sessions
        // persistSession: true, // Keep default or true for server client interacting with user sessions
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
  // Using the standard createClient for admin tasks where cookie-based sessions are not relevant.
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