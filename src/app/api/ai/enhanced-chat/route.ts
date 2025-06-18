import { NextRequest, NextResponse } from 'next/server';
import { generateEnhancedRAGResponse, type EnhancedRAGContext } from '@/lib/ai/enhanced-rag';
import { conversationService } from '@/lib/ai/conversation-service';
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
      userId,
      includeConversationMemory = true,
      sessionId // Optional: can be provided to continue specific session
    } = body;

    console.log('[Enhanced Chat] Raw request body:', {
      query: query?.substring(0, 100) + (query?.length > 100 ? '...' : ''),
      bookId,
      currentChunkIndex,
      userTier,
      readingMode,
      knowledgeLens,
      userId: userId?.substring(0, 8) + '...',
      includeConversationMemory,
      sessionId: sessionId?.substring(0, 8) + '...'
    });

    // Validate required fields
    if (!query || !bookId || !userId) {
      console.error('[Enhanced Chat] Missing required fields:', { 
        query: !!query, 
        bookId: !!bookId, 
        userId: !!userId 
      });
      return NextResponse.json(
        { error: 'Missing required fields: query, bookId, and userId are required' },
        { status: 400 }
      );
    }

    // Verify user authentication
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('[Enhanced Chat] Authentication failed:', { 
        authError, 
        userMatch: user?.id === userId 
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build enhanced RAG context
    const context: EnhancedRAGContext = {
      bookId: parseInt(bookId),
      currentChunkIndex: currentChunkIndex !== undefined ? parseInt(currentChunkIndex) : undefined,
      userTier,
      readingMode,
      knowledgeLens,
      userId,
      sessionId,
      includeConversationMemory
    };

    console.log('[Enhanced Chat] Processing request with enhanced context:', {
      userId: userId.substring(0, 8) + '...',
      bookId: context.bookId,
      currentChunkIndex: context.currentChunkIndex,
      userTier,
      readingMode,
      knowledgeLens,
      queryLength: query.length,
      includeMemory: includeConversationMemory
    });

    // Generate enhanced AI response with conversation memory
    const result = await generateEnhancedRAGResponse(query, context);

    console.log('[Enhanced Chat] Enhanced response generated successfully:', {
      responseLength: result.response.length,
      sessionId: result.sessionId,
      messageId: result.messageId,
      hasConversationContext: !!result.conversationContext
    });

    return NextResponse.json({
      response: result.response,
      sessionId: result.sessionId,
      messageId: result.messageId,
      conversationContext: result.conversationContext,
      context: {
        userTier,
        readingMode,
        knowledgeLens,
        currentChunkIndex: context.currentChunkIndex,
        timestamp: new Date().toISOString(),
        memoryEnabled: includeConversationMemory
      }
    });

  } catch (error) {
    console.error('[Enhanced Chat] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate enhanced AI response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve conversation history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userBookId = searchParams.get('userBookId');
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
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

    if (sessionId) {
      // Get specific conversation history
      const messages = await conversationService.getConversationHistory(sessionId, limit);
      const context = await conversationService.getConversationContext(sessionId);
      
      return NextResponse.json({
        messages,
        context,
        sessionId
      });
    } else if (userBookId) {
      // Get recent conversations for a specific book
      // This would require implementing a method to get sessions by user and book
      return NextResponse.json({
        message: 'Getting conversations by book not yet implemented'
      });
    } else {
      // Get recent conversations for user
      const recentSessions = await conversationService.getRecentConversations(userId, 10);
      
      return NextResponse.json({
        recentSessions
      });
    }

  } catch (error) {
    console.error('[Enhanced Chat GET] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve conversation data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 