import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { generateEmbedding, searchSimilarChunks } from '@/lib/ai/embeddings';

interface SemanticSearchRequest {
  query: string;
  bookId: number;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: SemanticSearchRequest = await request.json();
    const { query, bookId, limit = 10 } = body;

    // Validate required fields
    if (!query || !bookId) {
      return NextResponse.json(
        { error: 'Missing required fields: query, bookId' },
        { status: 400 }
      );
    }

    // Verify user has access to the book
    const { data: userBook, error: bookError } = await supabase
      .from('user_books')
      .select('id, public_book_db_id')
      .eq('user_id', user.id)
      .eq('public_book_db_id', bookId)
      .single();

    if (bookError || !userBook) {
      return NextResponse.json(
        { error: 'Book not found in user library' },
        { status: 404 }
      );
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Search for similar chunks
    const similarChunks = await searchSimilarChunks(
      queryEmbedding,
      bookId,
      limit,
      user.id
    );

    // Get the actual chunk content from the database
    const chunkIds = similarChunks.map(chunk => chunk.metadata.chunkIndex);
    
    const { data: chunks, error: chunksError } = await supabase
      .from('book_chunks')
      .select('chunk_index, content')
      .eq('public_book_id', bookId)
      .in('chunk_index', chunkIds)
      .order('chunk_index', { ascending: true });

    if (chunksError) {
      console.error('Error fetching chunk content:', chunksError);
      return NextResponse.json(
        { error: 'Error retrieving search results' },
        { status: 500 }
      );
    }

    // Combine similarity scores with chunk content
    const results = similarChunks.map(similarChunk => {
      const chunkContent = chunks?.find(
        chunk => chunk.chunk_index === similarChunk.metadata.chunkIndex
      );
      
      return {
        chunkIndex: similarChunk.metadata.chunkIndex,
        content: chunkContent?.content || '',
        similarity: similarChunk.score,
        preview: chunkContent?.content.substring(0, 200) + '...' || '',
      };
    }).filter(result => result.content); // Filter out any chunks without content

    return NextResponse.json({
      query,
      results,
      totalResults: results.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in semantic search API:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Search service configuration error' },
          { status: 503 }
        );
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Search service temporarily unavailable. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 