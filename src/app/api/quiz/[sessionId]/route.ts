import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getUserTier } from '@/lib/ai/rag';

interface SubmitAnswersRequest {
  answers: Array<{
    questionId: number;
    userAnswer: string;
  }>;
}

// GET /api/quiz/[sessionId] - Get quiz session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
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

    const { sessionId: sessionIdParam } = await params;
    const sessionId = parseInt(sessionIdParam);
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
    }

    // Get quiz session with user verification
    const { data: quizSession, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select(`
        *,
        user_books!inner(user_id, title)
      `)
      .eq('id', sessionId)
      .eq('user_books.user_id', user.id)
      .single();

    if (sessionError || !quizSession) {
      return NextResponse.json({ error: 'Quiz session not found' }, { status: 404 });
    }

    // Get quiz questions (without correct answers if not completed)
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_session_id', sessionId)
      .order('created_at');

    if (questionsError) {
      console.error('Error fetching quiz questions:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch quiz questions' }, { status: 500 });
    }

    // Format questions for response
    const formattedQuestions = questions?.map(q => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options ? JSON.parse(q.options) : null,
      user_answer: q.user_answer,
      is_correct: q.is_correct,
      // Include correct answer only if quiz is completed
      ...(quizSession.completed_at && { correct_answer: q.correct_answer })
    })) || [];

    return NextResponse.json({
      quizSession: {
        id: quizSession.id,
        quiz_type: quizSession.quiz_type,
        total_questions: quizSession.total_questions,
        correct_answers: quizSession.correct_answers,
        completed_at: quizSession.completed_at,
        time_taken_seconds: quizSession.time_taken_seconds,
        created_at: quizSession.created_at,
        bookTitle: quizSession.user_books.title
      },
      questions: formattedQuestions
    });

  } catch (error) {
    console.error('Error fetching quiz session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/quiz/[sessionId] - Submit quiz answers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user tier
    const userTier = await getUserTier(user.id);
    if (userTier !== 'PRO') {
      return NextResponse.json({ 
        error: 'Quiz Generator is a Pro feature. Please upgrade to access this functionality.',
        requiredTier: 'PRO',
        currentTier: userTier
      }, { status: 403 });
    }

    const { sessionId: sessionIdParam } = await params;
    const sessionId = parseInt(sessionIdParam);
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
    }

    const body: SubmitAnswersRequest = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers array is required' }, { status: 400 });
    }

    // Verify user owns this quiz session
    const { data: quizSession, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select(`
        *,
        user_books!inner(user_id)
      `)
      .eq('id', sessionId)
      .eq('user_books.user_id', user.id)
      .single();

    if (sessionError || !quizSession) {
      return NextResponse.json({ error: 'Quiz session not found' }, { status: 404 });
    }

    if (quizSession.completed_at) {
      return NextResponse.json({ error: 'Quiz has already been completed' }, { status: 400 });
    }

    // Get all questions for this session
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_session_id', sessionId);

    if (questionsError || !questions) {
      return NextResponse.json({ error: 'Failed to fetch quiz questions' }, { status: 500 });
    }

    // Process each answer
    let correctCount = 0;
    const updatePromises = answers.map(async (answer) => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) {
        throw new Error(`Question ${answer.questionId} not found`);
      }

      // Check if answer is correct
      const isCorrect = normalizeAnswer(answer.userAnswer) === normalizeAnswer(question.correct_answer);
      if (isCorrect) correctCount++;

      // Update question with user answer
      return supabase
        .from('quiz_questions')
        .update({
          user_answer: answer.userAnswer,
          is_correct: isCorrect
        })
        .eq('id', answer.questionId);
    });

    // Execute all updates
    const updateResults = await Promise.all(updatePromises);
    
    // Check for any update errors
    const updateErrors = updateResults.filter(result => result.error);
    if (updateErrors.length > 0) {
      console.error('Error updating quiz answers:', updateErrors);
      return NextResponse.json({ error: 'Failed to save some answers' }, { status: 500 });
    }

    // Calculate time taken (assuming quiz started when session was created)
    const startTime = new Date(quizSession.created_at);
    const endTime = new Date();
    const timeTakenSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    // Update quiz session with results
    const { data: updatedSession, error: updateSessionError } = await supabase
      .from('quiz_sessions')
      .update({
        correct_answers: correctCount,
        completed_at: new Date().toISOString(),
        time_taken_seconds: timeTakenSeconds
      })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (updateSessionError) {
      console.error('Error updating quiz session:', updateSessionError);
      return NextResponse.json({ error: 'Failed to complete quiz session' }, { status: 500 });
    }

    // Calculate score and performance metrics
    const score = Math.round((correctCount / questions.length) * 100);
    const averageTimePerQuestion = Math.round(timeTakenSeconds / questions.length);

    return NextResponse.json({
      message: 'Quiz completed successfully',
      results: {
        sessionId: sessionId,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        score: score,
        timeTakenSeconds: timeTakenSeconds,
        averageTimePerQuestion: averageTimePerQuestion,
        completedAt: updatedSession.completed_at
      },
      detailedResults: questions.map(q => {
        const userAnswer = answers.find(a => a.questionId === q.id);
        const isCorrect = userAnswer ? 
          normalizeAnswer(userAnswer.userAnswer) === normalizeAnswer(q.correct_answer) : false;
        
        return {
          questionId: q.id,
          question: q.question_text,
          correctAnswer: q.correct_answer,
          userAnswer: userAnswer?.userAnswer || null,
          isCorrect: isCorrect
        };
      })
    });

  } catch (error) {
    console.error('Error submitting quiz answers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/quiz/[sessionId] - Delete quiz session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user tier
    const userTier = await getUserTier(user.id);
    if (userTier !== 'PRO') {
      return NextResponse.json({ 
        error: 'Quiz Generator is a Pro feature. Please upgrade to access this functionality.',
        requiredTier: 'PRO',
        currentTier: userTier
      }, { status: 403 });
    }

    const { sessionId: sessionIdParam } = await params;
    const sessionId = parseInt(sessionIdParam);
    if (isNaN(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
    }

    // Verify user owns this quiz session
    const { data: quizSession, error: verifyError } = await supabase
      .from('quiz_sessions')
      .select(`
        id,
        user_books!inner(user_id)
      `)
      .eq('id', sessionId)
      .eq('user_books.user_id', user.id)
      .single();

    if (verifyError || !quizSession) {
      return NextResponse.json({ error: 'Quiz session not found' }, { status: 404 });
    }

    // Delete quiz session (questions will be deleted via CASCADE)
    const { error: deleteError } = await supabase
      .from('quiz_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Error deleting quiz session:', deleteError);
      return NextResponse.json({ error: 'Failed to delete quiz session' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Quiz session deleted successfully' });

  } catch (error) {
    console.error('Error deleting quiz session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to normalize answers for comparison
function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().trim().replace(/[^\w\s]/g, '');
} 