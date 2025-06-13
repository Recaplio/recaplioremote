import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

interface CreateAnnotationRequest {
  userBookId: number;
  type: 'highlight' | 'bookmark' | 'note';
  startOffset: number;
  endOffset: number;
  textContent: string;
  annotationData?: {
    color?: string;
    note?: string;
    chunkIndex?: number;
  };
}

// POST /api/annotations - Create new annotation
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateAnnotationRequest = await request.json();
    const { userBookId, type, startOffset, endOffset, textContent, annotationData } = body;

    // Validate input
    if (!userBookId || !type || startOffset === undefined || endOffset === undefined || !textContent) {
      return NextResponse.json({ 
        error: 'userBookId, type, startOffset, endOffset, and textContent are required' 
      }, { status: 400 });
    }

    const validTypes = ['highlight', 'bookmark', 'note'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid type. Must be one of: ' + validTypes.join(', ') 
      }, { status: 400 });
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

    // Create annotation
    const { data: annotation, error: insertError } = await supabase
      .from('annotations')
      .insert({
        user_book_id: userBookId,
        type: type,
        start_offset: startOffset,
        end_offset: endOffset,
        text_content: textContent,
        annotation_data: annotationData || {}
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating annotation:', insertError);
      return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Annotation created successfully',
      annotation: annotation
    });

  } catch (error) {
    console.error('Error in annotations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/annotations - Get annotations for a book
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
    const type = searchParams.get('type'); // Optional filter by type

    if (!userBookId) {
      return NextResponse.json({ error: 'userBookId parameter is required' }, { status: 400 });
    }

    const userBookIdNum = parseInt(userBookId);
    if (isNaN(userBookIdNum)) {
      return NextResponse.json({ error: 'Invalid userBookId' }, { status: 400 });
    }

    // Verify user has access to this book
    const { data: userBook, error: bookError } = await supabase
      .from('user_books')
      .select('id')
      .eq('id', userBookIdNum)
      .eq('user_id', user.id)
      .single();

    if (bookError || !userBook) {
      return NextResponse.json({ error: 'Book not found in user library' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('annotations')
      .select('*')
      .eq('user_book_id', userBookIdNum)
      .order('created_at', { ascending: false });

    // Filter by type if specified
    if (type && ['highlight', 'bookmark', 'note'].includes(type)) {
      query = query.eq('type', type);
    }

    const { data: annotations, error: annotationsError } = await query;

    if (annotationsError) {
      console.error('Error fetching annotations:', annotationsError);
      return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 });
    }

    return NextResponse.json({
      annotations: annotations || [],
      count: annotations?.length || 0
    });

  } catch (error) {
    console.error('Error in annotations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 