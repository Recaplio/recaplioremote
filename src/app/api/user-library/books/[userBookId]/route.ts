import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userBookId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params in Next.js 15
    const resolvedParams = await params;
    const userBookId = parseInt(resolvedParams.userBookId);
    if (isNaN(userBookId)) {
      return NextResponse.json({ error: 'Invalid userBookId' }, { status: 400 });
    }

    console.log('[USER-BOOK-DETAIL] Fetching book', userBookId, 'for user:', user.id);

    // Get user book data
    const { data: userBook, error: userBookError } = await supabase
      .from('user_books')
      .select('*')
      .eq('id', userBookId)
      .eq('user_id', user.id)
      .single();

    if (userBookError || !userBook) {
      console.error('[USER-BOOK-DETAIL] User book not found:', userBookError);
      return NextResponse.json({ error: 'Book not found in your library' }, { status: 404 });
    }

    // Get public book data using admin client
    const { data: publicBook, error: publicBookError } = await adminSupabase
      .from('public_books')
      .select('*')
      .eq('id', userBook.public_book_db_id)
      .single();

    if (publicBookError || !publicBook) {
      console.error('[USER-BOOK-DETAIL] Public book not found:', publicBookError);
      return NextResponse.json({ error: 'Book information not found' }, { status: 404 });
    }

    // Get book chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('book_chunks')
      .select('id, chunk_index, content, chapter_title')
      .eq('public_book_id', userBook.public_book_db_id)
      .order('chunk_index');

    if (chunksError) {
      console.error('[USER-BOOK-DETAIL] Chunks error:', chunksError);
      return NextResponse.json({ error: 'Failed to load book content' }, { status: 500 });
    }

    // Combine the data
    const bookData = {
      userBook: {
        id: userBook.id,
        readingProgress: userBook.reading_progress_percent || 0,
        currentChunkIndex: userBook.current_chunk_index || 0,
        readingMode: userBook.reading_mode || 'fiction',
        pinned: userBook.is_pinned || false
      },
      publicBook: {
        id: publicBook.id,
        title: publicBook.title,
        authors: publicBook.authors,
        gutenbergId: publicBook.gutenberg_id,
        genre: publicBook.genre,
        coverImageUrl: publicBook.cover_image_url
      },
      chunks: chunks || []
    };

    console.log('[USER-BOOK-DETAIL] Successfully fetched book with', chunks?.length || 0, 'chunks');

    return NextResponse.json(bookData);

  } catch (error) {
    console.error('[USER-BOOK-DETAIL] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 