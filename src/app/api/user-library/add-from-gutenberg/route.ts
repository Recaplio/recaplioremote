import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/utils/supabase/server'; // Admin for ingestion trigger

interface AddFromGutenbergPayload {
  gutenberg_id: number;
  title?: string;
  authors?: { name: string; birth_year?: number; death_year?: number }[];
  subjects?: string[];
  languages?: string[];
  // Add any other fields you might pass from the client for initial public_books record
}

// Helper to call the ingestion route internally
// NOTE: In a real-world scenario, you might refactor ingestion logic into a shared utility 
// function instead of an internal fetch call for robustness and to avoid HTTP overhead.
async function triggerIngestion(gutenbergId: number, adminSupabase: ReturnType<typeof createSupabaseAdminClient>): Promise<boolean> {
  const ingestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/gutenberg/books/${gutenbergId}/ingest`;
  console.log(`[AddFromGutenberg] Triggering ingestion for ${gutenbergId} via ${ingestUrl}`);
  
  try {
    // We need to be careful about how this internal call is authenticated if the ingest route expects auth.
    // For now, assuming the ingest route is callable (e.g., via an internal mechanism or it doesn't strictly require user session for the POST itself).
    // If it requires a specific auth header (like a service role key), that needs to be added.
    // For simplicity, if running in the same Next.js instance, cookies *might* be forwarded if using a relative path,
    // but an absolute URL with `localhost` or deployed URL is more common for internal API calls.
    // Let's assume NEXT_PUBLIC_APP_URL is set correctly.

    const response = await fetch(ingestUrl, { 
        method: 'POST' 
        // TODO: Add internal auth header if ingest route is protected by something other than user session cookies
        // headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } // Example if needed
    });

    if (!response.ok && response.status !== 201 && response.status !== 200 && response.status !== 409) { // 409 means already ingested/exists
      const errorBody = await response.text();
      console.error(`[AddFromGutenberg] Ingestion call for ${gutenbergId} failed. Status: ${response.status}, Body: ${errorBody}`);
      return false;
    }
    if (response.status === 409) {
        console.log(`[AddFromGutenberg] Ingestion for ${gutenbergId} reported conflict (409), likely already ingested or processed.`);
        // Check if it is indeed in public_books and ingested
        const { data: existingBook } = await adminSupabase.from('public_books').select('id, ingested_at').eq('gutenberg_id', gutenbergId).maybeSingle();
        return !!existingBook?.ingested_at;
    }

    console.log(`[AddFromGutenberg] Ingestion call for ${gutenbergId} successful or conflict. Status: ${response.status}`);
    return true;
  } catch (error) {
    console.error(`[AddFromGutenberg] Error during internal fetch to ingestion API for ${gutenbergId}:`, error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient(); // For user session
  const adminSupabase = createSupabaseAdminClient(); // For privileged operations like checking/inserting public_books and triggering ingest

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: AddFromGutenbergPayload;
  try {
    payload = await request.json();
  } catch (e: unknown) {
    console.error("[AddFromGutenberg] Error parsing request payload:", e);
    const message = e instanceof Error ? e.message : "Invalid JSON format";
    return NextResponse.json({ error: 'Invalid request payload', details: message }, { status: 400 });
  }

  const { gutenberg_id } = payload;

  if (!gutenberg_id || isNaN(Number(gutenberg_id))) {
    return NextResponse.json({ error: 'Invalid Gutenberg ID' }, { status: 400 });
  }
  const numericGutenbergId = Number(gutenberg_id);

  try {
    let publicBookId: number | null = null;
    let needsIngestion = true;

    // 1. Check if book exists in public_books
    const { data: existingPublicBook, error: fetchPublicBookError } = await adminSupabase
      .from('public_books')
      .select('id, ingested_at, raw_text_url') // Check raw_text_url as a proxy for initial metadata presence
      .eq('gutenberg_id', numericGutenbergId)
      .maybeSingle();

    if (fetchPublicBookError) {
      console.error(`[AddFromGutenberg] Error checking public_books for GID ${numericGutenbergId}:`, fetchPublicBookError);
      return NextResponse.json({ error: 'Database error checking book cache.', details: fetchPublicBookError.message }, { status: 500 });
    }

    if (existingPublicBook) {
      publicBookId = existingPublicBook.id;
      if (existingPublicBook.ingested_at) {
        needsIngestion = false;
        console.log(`[AddFromGutenberg] Book GID ${numericGutenbergId} (DB ID ${publicBookId}) already ingested.`);
      } else {
        console.log(`[AddFromGutenberg] Book GID ${numericGutenbergId} (DB ID ${publicBookId}) found but not ingested. Triggering ingestion.`);
      }
    } else {
      // Book not in public_books at all. It will be created by the ingestion process if it doesn't pre-create it.
      // Or, we can pre-create a minimal entry here if ingest route expects it.
      // The current ingest route (v1) handles upserting metadata from Gutendex if book not found or no raw_text_url.
      console.log(`[AddFromGutenberg] Book GID ${numericGutenbergId} not in public_books. Will be created/handled by ingestion.`);
      // No need to create public_books entry here, ingest route will do it.
    }

    // 2. Trigger ingestion if needed
    if (needsIngestion) {
      console.log(`[AddFromGutenberg] Attempting to ensure GID ${numericGutenbergId} is ingested.`);
      const ingestionSuccessful = await triggerIngestion(numericGutenbergId, adminSupabase);
      if (!ingestionSuccessful) {
          // Attempt to fetch the public_book_id again in case ingestion created it but triggerIngestion had an issue reporting success
          const { data: bookAfterFailedIngestAttempt, error: queryError } = await adminSupabase
            .from('public_books')
            .select('id, ingested_at')
            .eq('gutenberg_id', numericGutenbergId)
            .maybeSingle();

          if (queryError || !bookAfterFailedIngestAttempt?.id || !bookAfterFailedIngestAttempt?.ingested_at) {
             console.error(`[AddFromGutenberg] Ingestion failed for GID ${numericGutenbergId} and book is not available/ingested.`);
             return NextResponse.json({ error: 'Book processing failed. Could not ingest book text.' }, { status: 500 });
          }
          console.log(`[AddFromGutenberg] Ingestion trigger reported failure, but GID ${numericGutenbergId} seems ingested now. DB ID: ${bookAfterFailedIngestAttempt.id}. Proceeding.`);
          publicBookId = bookAfterFailedIngestAttempt.id;
      } else {
        // After successful ingestion, get the public_book_id if it wasn't known or if a new entry was made
        const { data: bookAfterIngest, error: queryError } = await adminSupabase
            .from('public_books')
            .select('id, ingested_at')
            .eq('gutenberg_id', numericGutenbergId)
            .single(); // Should exist now

        if (queryError || !bookAfterIngest?.id || !bookAfterIngest?.ingested_at) {
            console.error(`[AddFromGutenberg] Ingestion supposedly succeeded for GID ${numericGutenbergId} but couldn't find/confirm ingested record. Error:`, queryError);
            return NextResponse.json({ error: 'Book processing failed. Ingestion confirmation error.' }, { status: 500 });
        }
        publicBookId = bookAfterIngest.id;
        console.log(`[AddFromGutenberg] GID ${numericGutenbergId} successfully ingested/confirmed. DB ID: ${publicBookId}`);
      }
    }
    
    if (!publicBookId) {
        console.error(`[AddFromGutenberg] Failed to obtain a public_book_id for GID ${numericGutenbergId} after ingestion process.`);
        return NextResponse.json({ error: 'Book processing failed. Could not resolve book database ID.' }, { status: 500 });
    }

    // 3. Add to user_books
    // Check if already in user's library
    const { data: existingUserBook, error: checkUserBookError } = await supabase
      .from('user_books')
      .select('id')
      .eq('user_id', user.id)
      .eq('public_book_db_id', publicBookId)
      .maybeSingle();

    if (checkUserBookError) {
      console.error(`[AddFromGutenberg] Error checking user_books for (user: ${user.id}, public_book_db_id: ${publicBookId}):`, checkUserBookError);
      return NextResponse.json({ error: 'Database error checking user library.', details: checkUserBookError.message }, { status: 500 });
    }

    if (existingUserBook) {
      return NextResponse.json({ message: 'Book already in your library.', public_book_id: publicBookId, user_book_id: existingUserBook.id }, { status: 409 });
    }

    const { data: newUserBook, error: insertUserBookError } = await supabase
      .from('user_books')
      .insert({
        user_id: user.id,
        public_book_db_id: publicBookId,
        // progress, current_chunk_index, cfi can default or be null
      })
      .select('id')
      .single();

    if (insertUserBookError || !newUserBook) {
      console.error(`[AddFromGutenberg] Error inserting into user_books (user: ${user.id}, public_book_db_id: ${publicBookId}):`, insertUserBookError);
      return NextResponse.json({ error: 'Database error adding book to library.', details: insertUserBookError?.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Book added to your library successfully!', 
      public_book_id: publicBookId,
      user_book_id: newUserBook.id,
      gutenberg_id: numericGutenbergId 
    }, { status: 201 });

  } catch (error: unknown) {
    console.error(`[AddFromGutenberg] Unexpected error for GID ${numericGutenbergId}:`, error);
    const message = (error instanceof Error) ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: 'Unexpected error processing request.', details: message }, { status: 500 });
  }
} 