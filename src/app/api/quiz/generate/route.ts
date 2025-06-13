import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { generateAIResponse, getUserTier, type RAGContext } from '@/lib/ai/rag';

interface QuizRequest {
  userBookId: number;
  quizType: 'multiple_choice' | 'mixed';
  questionCount: number;
  chapterRange?: {
    start: number;
    end: number;
  };
}

interface QuizQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  correct_answer: string;
  options?: string[]; // For multiple choice
  source_chunk_id?: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user tier - Quiz Generator is Pro only
    const userTier = await getUserTier(user.id);
    if (userTier !== 'PRO') {
      return NextResponse.json({ 
        error: 'Quiz Generator is a Pro feature. Please upgrade to access this functionality.',
        requiredTier: 'PRO',
        currentTier: userTier
      }, { status: 403 });
    }

    const requestData: QuizRequest = await request.json();
    const { userBookId, quizType, questionCount, chapterRange } = requestData;

    // Validate input
    if (!userBookId || !quizType || !questionCount) {
      return NextResponse.json({ 
        error: 'userBookId, quizType, and questionCount are required' 
      }, { status: 400 });
    }

    if (questionCount < 1 || questionCount > 50) {
      return NextResponse.json({ 
        error: 'Question count must be between 1 and 50' 
      }, { status: 400 });
    }

    const validQuizTypes = ['multiple_choice', 'true_false', 'short_answer', 'mixed'];
    if (!validQuizTypes.includes(quizType)) {
      return NextResponse.json({ 
        error: 'Invalid quiz type. Must be one of: ' + validQuizTypes.join(', ') 
      }, { status: 400 });
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

    // Get book chunks for content (with optional chapter filtering)
    let chunksQuery = supabase
      .from('book_chunks')
      .select('id, content_text, chunk_index')
      .eq('book_id', userBook.public_book_db_id)
      .order('chunk_index');

    if (chapterRange) {
      // Assuming chunk_index correlates with chapter progression
      chunksQuery = chunksQuery
        .gte('chunk_index', chapterRange.start)
        .lte('chunk_index', chapterRange.end);
    }

    const { data: chunks, error: chunksError } = await chunksQuery.limit(100); // Limit for performance

    if (chunksError || !chunks || chunks.length === 0) {
      return NextResponse.json({ 
        error: 'No content found for quiz generation. Please ensure the book has been processed.' 
      }, { status: 404 });
    }

    // Prepare content for AI
    const contentSample = chunks
      .slice(0, 20) // Use first 20 chunks to avoid token limits
      .map(chunk => chunk.content_text)
      .join('\n\n');

    // Generate quiz using AI
    const ragContext: RAGContext = {
      bookId: userBook.public_book_db_id,
      userTier: 'PRO',
      readingMode: userBook.reading_mode as 'fiction' | 'non-fiction',
      knowledgeLens: 'knowledge', // Use knowledge lens for quizzes
      userId: user.id,
    };

    const quizPrompt = `Generate a ${questionCount}-question quiz based on the following content from "${userBook.title}". 

Quiz Type: ${quizType}
Reading Mode: ${userBook.reading_mode}

Content:
${contentSample}

Please format your response as a JSON array with this structure:
[
  {
    "question_text": "Your question here",
    "question_type": "${quizType === 'mixed' ? 'multiple_choice or true_false or short_answer' : quizType}",
    "correct_answer": "The correct answer",
    "options": ["Option A", "Option B", "Option C", "Option D"] // Only for multiple_choice
  }
]

Guidelines:
- For multiple choice: Provide 4 options with one correct answer
- For true/false: Make the correct_answer either "True" or "False"
- For short answer: Provide a concise but complete correct answer
- ${quizType === 'mixed' ? 'Mix question types evenly' : `All questions should be ${quizType}`}
- Questions should test comprehension, not just memorization
- Vary difficulty levels
- ${userBook.reading_mode === 'fiction' 
    ? 'Focus on plot, characters, themes, and literary elements' 
    : 'Focus on key concepts, arguments, facts, and analysis'}`;

    const aiResponse = await generateAIResponse(quizPrompt, ragContext);

    // Parse AI response to extract questions
    let questions: QuizQuestion[] = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedQuestions = JSON.parse(jsonMatch[0]);
        questions = parsedQuestions.map((q: { question_text: string; question_type: string; correct_answer: string; options?: string[] }) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          correct_answer: q.correct_answer,
          options: q.options || null,
          source_chunk_id: chunks[0]?.id || null // Link to first chunk for now
        }));
      } else {
        throw new Error('No JSON array found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI quiz response:', parseError);
      return NextResponse.json({ 
        error: 'Failed to generate properly formatted quiz',
        aiResponse: aiResponse.substring(0, 500) + '...'
      }, { status: 500 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'No valid questions generated' }, { status: 500 });
    }

    // Create quiz session
    const { data: quizSession, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        user_book_id: userBookId,
        quiz_type: quizType,
        total_questions: questions.length
      })
      .select('*')
      .single();

    if (sessionError) {
      console.error('Error creating quiz session:', sessionError);
      return NextResponse.json({ error: 'Failed to create quiz session' }, { status: 500 });
    }

    // Save questions to database
    const questionInserts = questions.map(q => ({
      quiz_session_id: quizSession.id,
      question_text: q.question_text,
      question_type: q.question_type,
      correct_answer: q.correct_answer,
      options: q.options ? JSON.stringify(q.options) : null,
      source_chunk_id: q.source_chunk_id
    }));

    const { data: savedQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionInserts)
      .select('*');

    if (questionsError) {
      console.error('Error saving quiz questions:', questionsError);
      return NextResponse.json({ error: 'Failed to save quiz questions' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Successfully generated ${questions.length} quiz questions`,
      quizSession: {
        id: quizSession.id,
        quiz_type: quizType,
        total_questions: questions.length,
        created_at: quizSession.created_at
      },
      questions: savedQuestions?.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options ? JSON.parse(q.options) : null
        // Don't include correct_answer in response
      })) || []
    });

  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 