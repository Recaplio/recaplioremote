import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getUserTier } from '@/lib/ai/rag';

// GET /api/flashcards/[userBookId] - Get all flashcards for a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userBookId: string }> }
) {
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

    const { userBookId: userBookIdParam } = await params;
    const userBookId = parseInt(userBookIdParam);
    if (isNaN(userBookId)) {
      return NextResponse.json({ error: 'Invalid userBookId' }, { status: 400 });
    }

    // Verify user has access to this book
    const { data: userBook, error: bookError } = await supabase
      .from('user_books')
      .select('id, title')
      .eq('id', userBookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !userBook) {
      return NextResponse.json({ error: 'Book not found in user library' }, { status: 404 });
    }

    // Get flashcards with optional filtering
    const { searchParams } = new URL(request.url);
    const dueOnly = searchParams.get('due') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('flashcards')
      .select(`
        id,
        front_text,
        back_text,
        difficulty_level,
        last_reviewed_at,
        next_review_at,
        review_count,
        correct_count,
        created_at,
        updated_at,
        annotation_id
      `)
      .eq('user_book_id', userBookId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter for due cards if requested
    if (dueOnly) {
      query = query.or(`next_review_at.is.null,next_review_at.lte.${new Date().toISOString()}`);
    }

    const { data: flashcards, error: flashcardsError } = await query;

    if (flashcardsError) {
      console.error('Error fetching flashcards:', flashcardsError);
      return NextResponse.json({ error: 'Failed to fetch flashcards' }, { status: 500 });
    }

    // Calculate statistics
    const totalCards = flashcards?.length || 0;
    const dueCards = flashcards?.filter(card => 
      !card.next_review_at || new Date(card.next_review_at) <= new Date()
    ).length || 0;
    const averageAccuracy = totalCards > 0 
      ? flashcards?.reduce((sum, card) => {
          const accuracy = card.review_count > 0 ? card.correct_count / card.review_count : 0;
          return sum + accuracy;
        }, 0) / totalCards
      : 0;

    return NextResponse.json({
      flashcards: flashcards || [],
      statistics: {
        totalCards,
        dueCards,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        bookTitle: userBook.title
      }
    });

  } catch (error) {
    console.error('Error in flashcards GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/flashcards/[userBookId] - Delete all flashcards for a book
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userBookId: string }> }
) {
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

    const { userBookId: userBookIdParam } = await params;
    const userBookId = parseInt(userBookIdParam);
    if (isNaN(userBookId)) {
      return NextResponse.json({ error: 'Invalid userBookId' }, { status: 400 });
    }

    // Verify user has access to this book
    const { data: userBook, error: bookError } = await supabase
      .from('user_books')
      .select('id')
      .eq('id', userBookId)
      .eq('user_id', user.id)
      .single();

    if (bookError || !userBook) {
      return NextResponse.json({ error: 'Book not found in user library' }, { status: 404 });
    }

    // Delete all flashcards for this book
    const { error: deleteError } = await supabase
      .from('flashcards')
      .delete()
      .eq('user_book_id', userBookId);

    if (deleteError) {
      console.error('Error deleting flashcards:', deleteError);
      return NextResponse.json({ error: 'Failed to delete flashcards' }, { status: 500 });
    }

    return NextResponse.json({ message: 'All flashcards deleted successfully' });

  } catch (error) {
    console.error('Error in flashcards DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 