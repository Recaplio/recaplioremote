import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { generateAIResponse, getUserTier, type RAGContext, type ChatMessage, type ReadingMode, type KnowledgeLens } from '@/lib/ai/rag';

interface ChatRequest {
  query: string;
  bookId: number;
  currentChunkIndex?: number;
  readingMode: ReadingMode;
  knowledgeLens: KnowledgeLens;
  conversationHistory?: ChatMessage[];
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
    const body: ChatRequest = await request.json();
    const { query, bookId, currentChunkIndex, readingMode, knowledgeLens, conversationHistory = [] } = body;

    // Validate required fields
    if (!query || !bookId || !readingMode || !knowledgeLens) {
      return NextResponse.json(
        { error: 'Missing required fields: query, bookId, readingMode, knowledgeLens' },
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

    // Get user tier
    const userTier = await getUserTier(user.id);

    // Build RAG context
    const ragContext: RAGContext = {
      bookId,
      currentChunkIndex,
      userTier,
      readingMode,
      knowledgeLens,
      userId: user.id,
    };

    // Generate AI response
    const aiResponse = await generateAIResponse(query, ragContext, conversationHistory);

    return NextResponse.json({
      response: aiResponse,
      userTier,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in AI chat API:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 503 }
        );
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable. Please try again later.' },
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