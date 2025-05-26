import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userBookId: string }> }
) {
  try {
    const { userBookId } = await params;
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userBookIdNum = parseInt(userBookId, 10);
    if (isNaN(userBookIdNum)) {
      return NextResponse.json({ error: 'Invalid user book ID' }, { status: 400 });
    }

    // Get user book info
    const { data: userBook, error: userBookError } = await supabase
      .from('user_books')
      .select(`
        id,
        user_id,
        public_book_db_id,
        current_chunk_index,
        public_books!inner (
          id,
          title,
          authors,
          gutenberg_id,
          ingested_at,
          cleaned_text_length
        )
      `)
      .eq('id', userBookIdNum)
      .eq('user_id', user.id)
      .single();

    if (userBookError || !userBook) {
      return NextResponse.json({ error: 'Book not found in user library' }, { status: 404 });
    }

    // Get chunk count
    const { count: chunkCount, error: chunkCountError } = await supabase
      .from('book_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('public_book_id', userBook.public_book_db_id);

    if (chunkCountError) {
      return NextResponse.json({ error: 'Error counting chunks' }, { status: 500 });
    }

    // Get current chunk content if available
    let currentChunkContent = null;
    if (userBook.current_chunk_index !== null && userBook.current_chunk_index !== undefined) {
      const { data: currentChunk, error: chunkError } = await supabase
        .from('book_chunks')
        .select('content')
        .eq('public_book_id', userBook.public_book_db_id)
        .eq('chunk_index', userBook.current_chunk_index)
        .single();

      if (!chunkError && currentChunk) {
        currentChunkContent = {
          index: userBook.current_chunk_index,
          preview: currentChunk.content.substring(0, 200) + '...',
          length: currentChunk.content.length
        };
      }
    }

    // Get first few chunks as sample
    const { data: sampleChunks, error: sampleError } = await supabase
      .from('book_chunks')
      .select('chunk_index, content')
      .eq('public_book_id', userBook.public_book_db_id)
      .order('chunk_index', { ascending: true })
      .limit(3);

    const sampleChunkPreviews = sampleChunks?.map(chunk => ({
      index: chunk.chunk_index,
      preview: chunk.content.substring(0, 100) + '...',
      length: chunk.content.length
    })) || [];

    // Get public book info separately to avoid TypeScript issues
    const { data: publicBook, error: publicBookError } = await supabase
      .from('public_books')
      .select('id, title, authors, gutenberg_id, ingested_at, cleaned_text_length')
      .eq('id', userBook.public_book_db_id)
      .single();

    if (publicBookError || !publicBook) {
      return NextResponse.json({ error: 'Public book not found' }, { status: 404 });
    }

    return NextResponse.json({
      userBook: {
        id: userBook.id,
        currentChunkIndex: userBook.current_chunk_index,
        publicBookId: userBook.public_book_db_id,
      },
      publicBook: {
        id: publicBook.id,
        title: publicBook.title,
        authors: publicBook.authors,
        gutenbergId: publicBook.gutenberg_id,
        ingestedAt: publicBook.ingested_at,
        cleanedTextLength: publicBook.cleaned_text_length,
      },
      chunks: {
        total: chunkCount || 0,
        currentChunk: currentChunkContent,
        sampleChunks: sampleChunkPreviews,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug book info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 