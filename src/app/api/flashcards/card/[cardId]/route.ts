import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getUserTier } from '@/lib/ai/rag';

interface FlashcardUpdateRequest {
  front_text?: string;
  back_text?: string;
  difficulty_level?: number;
}

interface ReviewRequest {
  correct: boolean;
  difficulty?: number;
}

// Calculate next review date using spaced repetition algorithm
function calculateNextReview(
  correct: boolean, 
  reviewCount: number, 
  correctCount: number, 
  difficultyLevel: number
): Date {
  const now = new Date();
  let intervalDays = 1;

  if (correct) {
    // Successful review - increase interval
    const successRate = reviewCount > 0 ? correctCount / reviewCount : 0;
    const baseInterval = Math.pow(2, Math.min(reviewCount, 10)); // Cap exponential growth
    const difficultyMultiplier = (6 - difficultyLevel) / 5; // Easier cards reviewed less frequently
    const successMultiplier = 0.5 + successRate; // Better performance = longer intervals
    
    intervalDays = Math.max(1, Math.round(baseInterval * difficultyMultiplier * successMultiplier));
  } else {
    // Failed review - reset to short interval
    intervalDays = Math.max(1, Math.round(difficultyLevel * 0.5));
  }

  // Cap maximum interval at 365 days
  intervalDays = Math.min(intervalDays, 365);

  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + intervalDays);
  return nextReview;
}

// GET /api/flashcards/card/[cardId] - Get specific flashcard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
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
        error: 'Flashcards are a Pro feature. Please upgrade to access this functionality.',
        requiredTier: 'PRO',
        currentTier: userTier
      }, { status: 403 });
    }

    const { cardId: cardIdParam } = await params;
    const cardId = parseInt(cardIdParam);
    if (isNaN(cardId)) {
      return NextResponse.json({ error: 'Invalid cardId' }, { status: 400 });
    }

    // Get flashcard with user verification
    const { data: flashcard, error: flashcardError } = await supabase
      .from('flashcards')
      .select(`
        *,
        user_books!inner(user_id, title)
      `)
      .eq('id', cardId)
      .eq('user_books.user_id', user.id)
      .single();

    if (flashcardError || !flashcard) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }

    return NextResponse.json({ flashcard });

  } catch (error) {
    console.error('Error fetching flashcard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/flashcards/card/[cardId] - Update flashcard content
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
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
        error: 'Flashcards are a Pro feature. Please upgrade to access this functionality.',
        requiredTier: 'PRO',
        currentTier: userTier
      }, { status: 403 });
    }

    const { cardId: cardIdParam } = await params;
    const cardId = parseInt(cardIdParam);
    if (isNaN(cardId)) {
      return NextResponse.json({ error: 'Invalid cardId' }, { status: 400 });
    }

    const body: FlashcardUpdateRequest = await request.json();
    const { front_text, back_text, difficulty_level } = body;

    // Validate input
    if (difficulty_level && (difficulty_level < 1 || difficulty_level > 5)) {
      return NextResponse.json({ error: 'Difficulty level must be between 1 and 5' }, { status: 400 });
    }

    // Verify user owns this flashcard
    const { data: existingCard, error: verifyError } = await supabase
      .from('flashcards')
      .select(`
        id,
        user_books!inner(user_id)
      `)
      .eq('id', cardId)
      .eq('user_books.user_id', user.id)
      .single();

    if (verifyError || !existingCard) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }

    // Update flashcard
    const updateData: Record<string, unknown> = {};
    if (front_text !== undefined) updateData.front_text = front_text;
    if (back_text !== undefined) updateData.back_text = back_text;
    if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: updatedCard, error: updateError } = await supabase
      .from('flashcards')
      .update(updateData)
      .eq('id', cardId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating flashcard:', updateError);
      return NextResponse.json({ error: 'Failed to update flashcard' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Flashcard updated successfully',
      flashcard: updatedCard 
    });

  } catch (error) {
    console.error('Error updating flashcard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/flashcards/card/[cardId] - Review flashcard (spaced repetition)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
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
        error: 'Flashcards are a Pro feature. Please upgrade to access this functionality.',
        requiredTier: 'PRO',
        currentTier: userTier
      }, { status: 403 });
    }

    const { cardId: cardIdParam } = await params;
    const cardId = parseInt(cardIdParam);
    if (isNaN(cardId)) {
      return NextResponse.json({ error: 'Invalid cardId' }, { status: 400 });
    }

    const requestData: ReviewRequest = await request.json();
    const { correct, difficulty } = requestData;

    if (typeof correct !== 'boolean') {
      return NextResponse.json({ error: 'correct field is required and must be boolean' }, { status: 400 });
    }

    // Get current flashcard data
    const { data: currentCard, error: fetchError } = await supabase
      .from('flashcards')
      .select(`
        *,
        user_books!inner(user_id)
      `)
      .eq('id', cardId)
      .eq('user_books.user_id', user.id)
      .single();

    if (fetchError || !currentCard) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }

    // Calculate new statistics
    const newReviewCount = currentCard.review_count + 1;
    const newCorrectCount = currentCard.correct_count + (correct ? 1 : 0);
    const newDifficultyLevel = difficulty || currentCard.difficulty_level;

    // Calculate next review date using spaced repetition
    const nextReviewAt = calculateNextReview(
      correct,
      newReviewCount,
      newCorrectCount,
      newDifficultyLevel
    );

    // Update flashcard with review data
    const { data: updatedCard, error: updateError } = await supabase
      .from('flashcards')
      .update({
        review_count: newReviewCount,
        correct_count: newCorrectCount,
        difficulty_level: newDifficultyLevel,
        last_reviewed_at: new Date().toISOString(),
        next_review_at: nextReviewAt.toISOString()
      })
      .eq('id', cardId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating flashcard review:', updateError);
      return NextResponse.json({ error: 'Failed to update flashcard review' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Flashcard review recorded successfully',
      flashcard: updatedCard,
      reviewResult: {
        correct,
        newAccuracy: newReviewCount > 0 ? Math.round((newCorrectCount / newReviewCount) * 100) : 0,
        nextReviewDate: nextReviewAt.toISOString(),
        intervalDays: Math.ceil((nextReviewAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      }
    });

  } catch (error) {
    console.error('Error reviewing flashcard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/flashcards/card/[cardId] - Delete specific flashcard
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
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
        error: 'Flashcards are a Pro feature. Please upgrade to access this functionality.',
        requiredTier: 'PRO',
        currentTier: userTier
      }, { status: 403 });
    }

    const { cardId: cardIdParam } = await params;
    const cardId = parseInt(cardIdParam);
    if (isNaN(cardId)) {
      return NextResponse.json({ error: 'Invalid cardId' }, { status: 400 });
    }

    // Verify user owns this flashcard before deleting
    const { data: existingCard, error: verifyError } = await supabase
      .from('flashcards')
      .select(`
        id,
        user_books!inner(user_id)
      `)
      .eq('id', cardId)
      .eq('user_books.user_id', user.id)
      .single();

    if (verifyError || !existingCard) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }

    // Delete the flashcard
    const { error: deleteError } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', cardId);

    if (deleteError) {
      console.error('Error deleting flashcard:', deleteError);
      return NextResponse.json({ error: 'Failed to delete flashcard' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Flashcard deleted successfully' });

  } catch (error) {
    console.error('Error deleting flashcard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 