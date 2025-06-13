import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[USER-LIBRARY-BOOKS] Fetching books for user:', user.id);

    // Get user books (this works fine)
    const { data: userBooks, error: userBooksError } = await supabase
      .from('user_books')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (userBooksError) {
      console.error('[USER-LIBRARY-BOOKS] User books error:', userBooksError);
      return NextResponse.json({ error: 'Failed to fetch user books' }, { status: 500 });
    }

    if (!userBooks || userBooks.length === 0) {
      return NextResponse.json({ books: [] });
    }

    // Get public book IDs
    const publicBookIds = userBooks.map(ub => ub.public_book_db_id).filter(Boolean);

    // Fetch public books using admin client (this bypasses RLS)
    const { data: publicBooks, error: publicBooksError } = await adminSupabase
      .from('public_books')
      .select('id, gutenberg_id, title, authors, genre, cover_image_url')
      .in('id', publicBookIds);

    if (publicBooksError) {
      console.error('[USER-LIBRARY-BOOKS] Public books error:', publicBooksError);
      return NextResponse.json({ error: 'Failed to fetch book details' }, { status: 500 });
    }

    // Combine the data
    const combinedBooks = userBooks.map(userBook => {
      const publicBook = publicBooks?.find(pb => pb.id === userBook.public_book_db_id);
      return {
        id: userBook.id,
        userBookId: userBook.id,
        publicBookId: userBook.public_book_db_id,
        title: publicBook?.title || `Book ${userBook.id}`,
        author: publicBook?.authors?.map((a: any) => a.name).join(', ') || 'Unknown Author',
        genre: publicBook?.genre || 'N/A',
        readingProgress: userBook.reading_progress_percent || 0,
        isPinned: userBook.is_pinned || false,
        coverImageUrl: publicBook?.cover_image_url,
        gutenbergId: publicBook?.gutenberg_id,
        readingMode: userBook.reading_mode,
        currentChunkIndex: userBook.current_chunk_index,
        uploadDate: userBook.added_at,
        createdAt: userBook.added_at
      };
    });

    console.log('[USER-LIBRARY-BOOKS] Successfully fetched', combinedBooks.length, 'books');

    return NextResponse.json({ books: combinedBooks });

  } catch (error) {
    console.error('[USER-LIBRARY-BOOKS] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 