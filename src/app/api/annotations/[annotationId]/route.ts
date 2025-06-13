import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

interface UpdateAnnotationRequest {
  text_content?: string;
  annotation_data?: Record<string, unknown>;
  type?: 'highlight' | 'bookmark' | 'note';
}

// GET /api/annotations/[annotationId] - Get specific annotation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ annotationId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { annotationId: annotationIdParam } = await params;
    const annotationId = parseInt(annotationIdParam);
    if (isNaN(annotationId)) {
      return NextResponse.json({ error: 'Invalid annotationId' }, { status: 400 });
    }

    // Get annotation with user verification
    const { data: annotation, error: annotationError } = await supabase
      .from('annotations')
      .select(`
        *,
        user_books!inner(user_id, title)
      `)
      .eq('id', annotationId)
      .eq('user_books.user_id', user.id)
      .single();

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    return NextResponse.json({ annotation });

  } catch (error) {
    console.error('Error fetching annotation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/annotations/[annotationId] - Update annotation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ annotationId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { annotationId: annotationIdParam } = await params;
    const annotationId = parseInt(annotationIdParam);
    if (isNaN(annotationId)) {
      return NextResponse.json({ error: 'Invalid annotationId' }, { status: 400 });
    }

    const requestData: UpdateAnnotationRequest = await request.json();
    const { text_content, annotation_data, type } = requestData;

    // Verify user owns this annotation
    const { data: annotation, error: fetchError } = await supabase
      .from('annotations')
      .select(`
        id,
        user_book_id,
        user_books!inner (
          user_id
        )
      `)
      .eq('id', annotationId)
      .single();

    if (fetchError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Type assertion for the joined data
    const userBooks = annotation.user_books as Array<{ user_id: string }>;
    if (!userBooks || userBooks.length === 0 || userBooks[0].user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update annotation
    const updateFields: Record<string, unknown> = {};
    if (text_content !== undefined) updateFields.text_content = text_content;
    if (annotation_data !== undefined) updateFields.annotation_data = annotation_data;
    if (type !== undefined) updateFields.type = type;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateFields.updated_at = new Date().toISOString();

    const { data: updatedAnnotation, error: updateError } = await supabase
      .from('annotations')
      .update(updateFields)
      .eq('id', annotationId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating annotation:', updateError);
      return NextResponse.json({ error: 'Failed to update annotation' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Annotation updated successfully',
      annotation: updatedAnnotation 
    });

  } catch (error) {
    console.error('Error updating annotation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/annotations/[annotationId] - Delete annotation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ annotationId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { annotationId: annotationIdParam } = await params;
    const annotationId = parseInt(annotationIdParam);
    if (isNaN(annotationId)) {
      return NextResponse.json({ error: 'Invalid annotationId' }, { status: 400 });
    }

    // Verify user owns this annotation before deleting
    const { data: existingAnnotation, error: verifyError } = await supabase
      .from('annotations')
      .select(`
        id,
        user_books!inner(user_id)
      `)
      .eq('id', annotationId)
      .eq('user_books.user_id', user.id)
      .single();

    if (verifyError || !existingAnnotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Delete the annotation
    const { error: deleteError } = await supabase
      .from('annotations')
      .delete()
      .eq('id', annotationId);

    if (deleteError) {
      console.error('Error deleting annotation:', deleteError);
      return NextResponse.json({ error: 'Failed to delete annotation' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Annotation deleted successfully' });

  } catch (error) {
    console.error('Error deleting annotation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 