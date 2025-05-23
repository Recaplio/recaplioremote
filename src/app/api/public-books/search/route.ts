import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '../../../../utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('searchTerm');

  if (!searchTerm || searchTerm.trim().length < 2) {
    return NextResponse.json(
      { error: 'Search term is required and must be at least 2 characters long.' },
      { status: 400 }
    );
  }

  try {
    const searchTermTrimmed = searchTerm.trim();
    const limit = 50; // Define the limit

    // Call the PostgreSQL function, now with search_term and result_limit
    const { data: books, error } = await supabase.rpc('search_public_books', { 
      search_term: searchTermTrimmed,
      result_limit: limit // Pass the limit to the SQL function
    });
    // Note: .limit() cannot be directly chained to rpc in the same way as .from().select().
    // If limiting is crucial, the function itself should handle it, or fetch all and slice in JS (less ideal for large datasets).
    // For now, we assume the function might return many results and we are not explicitly limiting here in the client call.
    // If the function `search_public_books` needs a limit, it would be like: `SELECT ... LIMIT 50;` inside the function.

    if (error) {
      console.error('Supabase RPC error:', error);
      return NextResponse.json(
        { error: 'Failed to search books via RPC.', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ books: books || [] });

  } catch (err: unknown) {
    console.error('Search API error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: (err instanceof Error) ? err.message : String(err) },
      { status: 500 }
    );
  }
} 