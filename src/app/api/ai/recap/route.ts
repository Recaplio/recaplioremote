import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { generateAIResponse, getUserTier, type RAGContext } from '@/lib/ai/rag';

interface AIRecapRequest {
  userBookId: number;
  recapType: 'progress' | 'chapter' | 'full_book';
  currentChunkIndex?: number; // For progress recap
  chapterRange?: {
    start: number;
    end: number;
  }; // For chapter recap
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user tier (AI Recap available to all tiers, but quality differs)
    const userTier = await getUserTier(user.id);

    const body: AIRecapRequest = await request.json();
    const { userBookId, recapType, currentChunkIndex, chapterRange } = body;

    // Validate input
    if (!userBookId || !recapType) {
      return NextResponse.json({ 
        error: 'userBookId and recapType are required' 
      }, { status: 400 });
    }

    const validRecapTypes = ['progress', 'chapter', 'full_book'];
    if (!validRecapTypes.includes(recapType)) {
      return NextResponse.json({ 
        error: 'Invalid recapType. Must be one of: ' + validRecapTypes.join(', ') 
      }, { status: 400 });
    }

    // Verify user has access to this book
    const { data: userBook, error: bookError } = await supabase
      .from('user_books')
      .select('id, public_book_db_id, title, author, reading_mode, progress')
      .eq('id', userBookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !userBook) {
      return NextResponse.json({ error: 'Book not found in user library' }, { status: 404 });
    }

    // Get relevant content based on recap type
    let contentChunks: Array<{ content_text: string; chunk_index: number }> = [];
    let recapScope = '';

    switch (recapType) {
      case 'progress':
        // Get chunks up to current reading position
        const maxChunkIndex = currentChunkIndex || Math.floor((userBook.progress || 0) * 100); // Rough estimate
        const { data: progressChunks, error: progressError } = await supabase
          .from('book_chunks')
          .select('content_text, chunk_index')
          .eq('book_id', userBook.public_book_db_id)
          .lte('chunk_index', maxChunkIndex)
          .order('chunk_index')
          .limit(20); // Limit for performance

        if (!progressError && progressChunks) {
          contentChunks = progressChunks;
          recapScope = `reading progress (up to ${Math.round((userBook.progress || 0) * 100)}%)`;
        }
        break;

      case 'chapter':
        // Get specific chapter range
        if (!chapterRange) {
          return NextResponse.json({ 
            error: 'chapterRange is required for chapter recap' 
          }, { status: 400 });
        }

        const { data: chapterChunks, error: chapterError } = await supabase
          .from('book_chunks')
          .select('content_text, chunk_index')
          .eq('book_id', userBook.public_book_db_id)
          .gte('chunk_index', chapterRange.start)
          .lte('chunk_index', chapterRange.end)
          .order('chunk_index')
          .limit(30);

        if (!chapterError && chapterChunks) {
          contentChunks = chapterChunks;
          recapScope = `chapters ${chapterRange.start}-${chapterRange.end}`;
        }
        break;

      case 'full_book':
        // Get representative chunks from throughout the book
        const { data: allChunks, error: allChunksError } = await supabase
          .from('book_chunks')
          .select('content_text, chunk_index')
          .eq('book_id', userBook.public_book_db_id)
          .order('chunk_index');

        if (!allChunksError && allChunks) {
          // Sample chunks evenly throughout the book
          const sampleSize = Math.min(25, allChunks.length);
          const step = Math.floor(allChunks.length / sampleSize);
          contentChunks = allChunks.filter((_, index) => index % step === 0).slice(0, sampleSize);
          recapScope = 'entire book';
        }
        break;
    }

    if (contentChunks.length === 0) {
      return NextResponse.json({ 
        error: 'No content found for recap generation. Please ensure the book has been processed.' 
      }, { status: 404 });
    }

    // Get user's annotations for additional context
    const { data: annotations } = await supabase
      .from('annotations')
      .select('text_content, type, annotation_data')
      .eq('user_book_id', userBookId)
      .limit(10); // Include some user highlights/notes

    const userHighlights = annotations?.filter(a => a.type === 'highlight').slice(0, 5) || [];
    const userNotes = annotations?.filter(a => a.type === 'note').slice(0, 3) || [];

    // Prepare content for AI
    const contentText = contentChunks.map(chunk => chunk.content_text).join('\n\n');
    const highlightsText = userHighlights.length > 0 
      ? '\n\nUser Highlights:\n' + userHighlights.map(h => `"${h.text_content}"`).join('\n')
      : '';
    const notesText = userNotes.length > 0 
      ? '\n\nUser Notes:\n' + userNotes.map(n => `- ${n.text_content}`).join('\n')
      : '';

    // Generate tier-specific prompts
    const ragContext: RAGContext = {
      bookId: userBook.public_book_db_id,
      userTier: userTier,
      readingMode: userBook.reading_mode as 'fiction' | 'non-fiction',
      knowledgeLens: 'knowledge', // Use knowledge lens for recaps
      userId: user.id,
    };

    let recapPrompt = '';
    let aiModel = '';

    switch (userTier) {
      case 'FREE':
        aiModel = 'gpt-4o-mini';
        recapPrompt = `Provide a brief recap of what the user has learned from "${userBook.title}" based on their ${recapScope}. 

Content:
${contentText}${highlightsText}${notesText}

Keep the recap concise (2-3 paragraphs) and focus on:
- Main points or plot developments
- Key concepts or themes
- Important takeaways

Format as a clear, easy-to-read summary.`;
        break;

      case 'PREMIUM':
        aiModel = 'gpt-4o';
        recapPrompt = `Provide a comprehensive recap of what the user has learned from "${userBook.title}" based on their ${recapScope}.

Content:
${contentText}${highlightsText}${notesText}

Create a detailed recap (3-4 paragraphs) that includes:
- Detailed summary of main points/plot developments
- Analysis of key themes and concepts
- Connections between different ideas
- Practical insights and takeaways
- How this relates to the user's highlighted content

Format with clear sections and engaging language.`;
        break;

      case 'PRO':
        aiModel = 'gpt-4o';
        recapPrompt = `Provide a professional-grade learning recap of "${userBook.title}" based on the user's ${recapScope}.

Content:
${contentText}${highlightsText}${notesText}

Create a comprehensive analysis (4-5 paragraphs) that includes:
- Executive summary of key developments/concepts
- Deep analysis of themes, arguments, and literary/conceptual elements
- Critical evaluation and synthesis of ideas
- Connections to broader knowledge and implications
- Personalized insights based on user's highlights and notes
- Actionable takeaways and next steps for learning

${userBook.reading_mode === 'fiction' 
  ? 'Focus on character development, thematic analysis, narrative techniques, and literary significance.'
  : 'Focus on argument structure, evidence evaluation, conceptual frameworks, and practical applications.'
}

Format as a professional learning summary with clear structure and sophisticated analysis.`;
        break;
    }

    const aiResponse = await generateAIResponse(recapPrompt, ragContext);

    // Save the recap to database
    const { data: savedRecap, error: saveError } = await supabase
      .from('ai_recaps')
      .insert({
        user_book_id: userBookId,
        recap_type: recapType,
        content: aiResponse,
        ai_model_used: aiModel,
        user_tier: userTier
      })
      .select('*')
      .single();

    if (saveError) {
      console.error('Error saving AI recap:', saveError);
      // Don't fail the request for this
    }

    return NextResponse.json({
      message: 'AI recap generated successfully',
      recap: {
        id: savedRecap?.id,
        type: recapType,
        content: aiResponse,
        scope: recapScope,
        bookTitle: userBook.title,
        userTier: userTier,
        aiModel: aiModel,
        createdAt: savedRecap?.created_at || new Date().toISOString()
      },
      metadata: {
        contentChunksAnalyzed: contentChunks.length,
        userHighlightsIncluded: userHighlights.length,
        userNotesIncluded: userNotes.length,
        readingProgress: Math.round((userBook.progress || 0) * 100)
      }
    });

  } catch (error) {
    console.error('Error generating AI recap:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/ai/recap - Get recap history for user
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userBookId = searchParams.get('userBookId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('ai_recaps')
      .select(`
        *,
        user_books!inner(title, user_id)
      `)
      .eq('user_books.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userBookId) {
      query = query.eq('user_book_id', parseInt(userBookId));
    }

    const { data: recaps, error: recapsError } = await query;

    if (recapsError) {
      console.error('Error fetching AI recaps:', recapsError);
      return NextResponse.json({ error: 'Failed to fetch AI recaps' }, { status: 500 });
    }

    return NextResponse.json({
      recaps: recaps?.map(recap => ({
        id: recap.id,
        type: recap.recap_type,
        content: recap.content,
        bookTitle: recap.user_books.title,
        userTier: recap.user_tier,
        aiModel: recap.ai_model_used,
        createdAt: recap.created_at
      })) || []
    });

  } catch (error) {
    console.error('Error fetching AI recap history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 