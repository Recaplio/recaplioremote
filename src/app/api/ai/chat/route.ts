import { NextRequest, NextResponse } from 'next/server';
import { generateRAGResponse, type RAGContext } from '@/lib/ai/rag';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query, 
      bookId, 
      currentChunkIndex, 
      userTier = 'FREE',
      readingMode = 'fiction',
      knowledgeLens = 'literary',
      userId
    } = body;

    // Validate required fields
    if (!query || !bookId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: query, bookId, and userId are required' },
        { status: 400 }
      );
    }

    // Verify user authentication
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build RAG context
    const context: RAGContext = {
      bookId: parseInt(bookId),
      currentChunkIndex: currentChunkIndex ? parseInt(currentChunkIndex) : undefined,
      userTier,
      readingMode,
      knowledgeLens,
      userId
    };

    console.log('[AI Chat] Processing request:', {
      userId,
      bookId: context.bookId,
      userTier,
      readingMode,
      knowledgeLens,
      queryLength: query.length
    });

    // Generate enhanced AI response
    const response = await generateRAGResponse(query, context);

    return NextResponse.json({
      response,
      context: {
        userTier,
        readingMode,
        knowledgeLens,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[AI Chat] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate AI response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 