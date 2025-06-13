import { NextRequest, NextResponse } from 'next/server';
import { updateLearningProfile } from '@/lib/ai/rag';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, feedback, userId } = body;

    // Validate required fields
    if (!messageId || !feedback || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, feedback, and userId are required' },
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

    // Validate feedback type
    const validFeedback = ['helpful', 'too_long', 'too_short', 'off_topic'];
    if (!validFeedback.includes(feedback)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    console.log('[AI Feedback] Processing feedback:', {
      userId,
      messageId,
      feedback
    });

    // Update user learning profile based on feedback
    // Note: We pass a generic query since we don't store the original query
    await updateLearningProfile(userId, 'user_feedback', 'feedback', feedback);

    return NextResponse.json({
      success: true,
      message: 'Feedback received and learning profile updated',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI Feedback] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 