'use client'; // This file will be used in client components

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Optional: A single instance for client-side usage throughout the app
// This helps avoid creating multiple clients if not necessary.
// However, for server components or route handlers, you should always create a new client.
// const supabaseBrowserClient = createSupabaseBrowserClient();
// export default supabaseBrowserClient;
// For now, we'll export the factory function to be called where needed. 