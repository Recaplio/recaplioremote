import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Use try-catch if the set method can throw (e.g., in Server Components)
              // but in Route Handlers, direct set should be fine.
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('Error exchanging code for session:', error);
    const errorMessage = error.message ? encodeURIComponent(error.message) : 'An unknown error occurred';
    return NextResponse.redirect(`${origin}/login?error=auth_callback_exchange_failed&message=${errorMessage}`);
  }

  console.error('No code found in callback URL.');
  return NextResponse.redirect(`${origin}/login?error=auth_callback_missing_code&message=Authorization%20code%20missing.`);
}
