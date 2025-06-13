import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userBookId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    
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

    // Fetch user book with public book details
    const { data: userBook, error: userBookError } = await supabase
      .from('user_books')
      .select(`
        id,
        user_id,
        public_book_db_id,
        title,
        author,
        genre,
        reading_mode,
        reading_progress_percent,
        current_chunk_index,
        pinned,
        file_url,
        original_filename,
        upload_date,
        created_at,
        updated_at,
        public_books (
          id,
          title,
          authors,
          genre,
          language,
          gutenberg_id,
          cover_image_url
        )
      `)
      .eq('id', userBookId)
      .eq('user_id', user.id)
      .single();

    if (userBookError || !userBook) {
      return NextResponse.json({ error: 'Book not found in user library' }, { status: 404 });
    }

    return NextResponse.json(userBook);

  } catch (error) {
    console.error('Error fetching user book:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 