import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { searchSimilarChunks, generateEmbedding } from '@/lib/ai/embeddings';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookIdNum = parseInt(bookId, 10);
    if (isNaN(bookIdNum)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    // Check if user has access to this book
    const { data: userBook, error: bookError } = await supabase
      .from('user_books')
      .select('id, public_book_db_id')
      .eq('user_id', user.id)
      .eq('public_book_db_id', bookIdNum)
      .single();

    if (bookError || !userBook) {
      return NextResponse.json({ error: 'Book not found in user library' }, { status: 404 });
    }

    // Get book chunks count
    const { count: chunkCount, error: chunkCountError } = await supabase
      .from('book_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('public_book_id', bookIdNum);

    if (chunkCountError) {
      return NextResponse.json({ error: 'Error counting chunks' }, { status: 500 });
    }

    // Test embedding search with a simple query
    let embeddingTestResult = null;
    try {
      const testQuery = "the main character";
      const queryEmbedding = await generateEmbedding(testQuery);
      const similarChunks = await searchSimilarChunks(queryEmbedding, bookIdNum, 3, user.id);
      
      embeddingTestResult = {
        query: testQuery,
        foundChunks: similarChunks.length,
        topSimilarity: similarChunks.length > 0 ? similarChunks[0].score : null,
        chunks: similarChunks.map(chunk => ({
          chunkIndex: chunk.metadata.chunkIndex,
          similarity: chunk.score,
          preview: chunk.metadata.content.substring(0, 100) + '...'
        }))
      };
    } catch (embeddingError) {
      embeddingTestResult = {
        error: embeddingError instanceof Error ? embeddingError.message : 'Unknown embedding error'
      };
    }

    return NextResponse.json({
      bookId: bookIdNum,
      userBookId: userBook.id,
      chunkCount: chunkCount || 0,
      embeddingTest: embeddingTestResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug embeddings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 