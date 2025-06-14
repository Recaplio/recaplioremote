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

    console.log('[AI Chat] Raw request body:', {
      query: query?.substring(0, 100) + (query?.length > 100 ? '...' : ''),
      bookId,
      currentChunkIndex,
      userTier,
      readingMode,
      knowledgeLens,
      userId: userId?.substring(0, 8) + '...'
    });

    // Validate required fields
    if (!query || !bookId || !userId) {
      console.error('[AI Chat] Missing required fields:', { query: !!query, bookId: !!bookId, userId: !!userId });
      return NextResponse.json(
        { error: 'Missing required fields: query, bookId, and userId are required' },
        { status: 400 }
      );
    }

    // Verify user authentication
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('[AI Chat] Authentication failed:', { authError, userMatch: user?.id === userId });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build RAG context
    const context: RAGContext = {
      bookId: parseInt(bookId),
      currentChunkIndex: currentChunkIndex !== undefined ? parseInt(currentChunkIndex) : undefined,
      userTier,
      readingMode,
      knowledgeLens,
      userId
    };

    console.log('[AI Chat] Processing request with context:', {
      userId: userId.substring(0, 8) + '...',
      bookId: context.bookId,
      currentChunkIndex: context.currentChunkIndex,
      userTier,
      readingMode,
      knowledgeLens,
      queryLength: query.length
    });

    // Generate enhanced AI response
    const response = await generateRAGResponse(query, context);

    console.log('[AI Chat] Response generated successfully, length:', response.length);

    return NextResponse.json({
      response,
      context: {
        userTier,
        readingMode,
        knowledgeLens,
        currentChunkIndex: context.currentChunkIndex,
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