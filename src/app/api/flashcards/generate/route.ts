import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { generateAIResponse, getUserTier, type RAGContext } from '@/lib/ai/rag';

interface GenerateRequest {
  userBookId: number;
  textSelection: string;
  count: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user tier - Flashcards are Pro only
    const userTier = await getUserTier(user.id);
    if (userTier !== 'PRO') {
      return NextResponse.json({ 
        error: 'Flashcards are a Pro feature. Please upgrade to access this functionality.',
        requiredTier: 'PRO',
        currentTier: userTier
      }, { status: 403 });
    }

    const requestData: GenerateRequest = await request.json();
    const { userBookId, textSelection, count = 5 } = requestData;

    if (!userBookId) {
      return NextResponse.json({ error: 'userBookId is required' }, { status: 400 });
    }

    // Verify user has access to this book
    const { data: userBook, error: bookError } = await supabase
      .from('user_books')
      .select('id, public_book_db_id, title, reading_mode')
      .eq('id', userBookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !userBook) {
      return NextResponse.json({ error: 'Book not found in user library' }, { status: 404 });
    }

    let sourceContent = '';

    // Get content from annotations or text selection
    if (textSelection) {
      sourceContent = textSelection;
    } else {
      return NextResponse.json({ 
        error: 'textSelection must be provided' 
      }, { status: 400 });
    }

    if (!sourceContent.trim()) {
      return NextResponse.json({ error: 'No content found to generate flashcards from' }, { status: 400 });
    }

    // Generate flashcards using AI
    const ragContext: RAGContext = {
      bookId: userBook.public_book_db_id,
      userTier: 'PRO',
      readingMode: userBook.reading_mode as 'fiction' | 'non-fiction',
      knowledgeLens: 'knowledge', // Use knowledge lens for flashcards
      userId: user.id,
    };

    const flashcardPrompt = `Based on the following content from "${userBook.title}", generate ${count} high-quality flashcards for studying and retention. Each flashcard should have a clear, concise front (question/prompt) and a comprehensive back (answer/explanation).

Content to convert to flashcards:
${sourceContent}

Please format your response as a JSON array with this structure:
[
  {
    "front": "Question or prompt",
    "back": "Answer or explanation"
  }
]

Guidelines:
- Make questions specific and testable
- Include key concepts, definitions, and important details
- Vary question types (what, why, how, when, who)
- Ensure answers are complete but concise
- Focus on the most important information for retention`;

    const aiResponse = await generateAIResponse(flashcardPrompt, ragContext);

    // Parse AI response to extract flashcards
    let flashcards: Array<{ front: string; back: string }> = [];
    try {
      // Try to extract JSON from the AI response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        flashcards = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI flashcard response:', parseError);
      return NextResponse.json({ 
        error: 'Failed to generate properly formatted flashcards',
        aiResponse: aiResponse.substring(0, 500) + '...' // For debugging
      }, { status: 500 });
    }

    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      return NextResponse.json({ error: 'No valid flashcards generated' }, { status: 500 });
    }

    // Save flashcards to database
    const generatedCards = flashcards.map((card) => ({
      front_text: card.front,
      back_text: card.back,
      user_book_id: userBookId,
      difficulty_level: 1,
      annotation_id: null
    }));

    const { data: savedFlashcards, error: insertError } = await supabase
      .from('flashcards')
      .insert(generatedCards)
      .select('*');

    if (insertError) {
      console.error('Error saving flashcards:', insertError);
      return NextResponse.json({ error: 'Failed to save flashcards' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Successfully generated ${flashcards.length} flashcards`,
      flashcards: savedFlashcards,
      generatedCount: flashcards.length
    });

  } catch (error) {
    console.error('Error generating flashcards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 