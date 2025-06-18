import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/lib/ai/conversation-service';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      messageId, 
      feedback, 
      userId, 
      sessionId 
    } = body;

    console.log('[Enhanced Feedback] Received feedback:', {
      messageId: messageId?.substring(0, 8) + '...',
      feedback,
      userId: userId?.substring(0, 8) + '...',
      sessionId: sessionId?.substring(0, 8) + '...'
    });

    // Validate required fields
    if (!messageId || !feedback || !userId) {
      console.error('[Enhanced Feedback] Missing required fields:', { 
        messageId: !!messageId, 
        feedback: !!feedback, 
        userId: !!userId 
      });
      return NextResponse.json(
        { error: 'Missing required fields: messageId, feedback, and userId are required' },
        { status: 400 }
      );
    }

    // Verify user authentication
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.error('[Enhanced Feedback] Authentication failed:', { 
        authError, 
        userMatch: user?.id === userId 
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate feedback type
    const validFeedback = ['helpful', 'too_long', 'too_short', 'off_topic'];
    if (!validFeedback.includes(feedback)) {
      return NextResponse.json(
        { error: 'Invalid feedback type. Must be one of: ' + validFeedback.join(', ') },
        { status: 400 }
      );
    }

    // Add feedback to the message
    await conversationService.addMessageFeedback(messageId, feedback);

    // Update user preferences based on feedback
    if (sessionId) {
      await updateUserPreferencesFromFeedback(sessionId, feedback);
    }

    console.log('[Enhanced Feedback] Feedback processed successfully');

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      feedback,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Enhanced Feedback] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Update user preferences based on feedback patterns
 */
async function updateUserPreferencesFromFeedback(
  sessionId: string, 
  feedback: string
): Promise<void> {
  try {
    // Get current user preferences context
    const contextData = await conversationService.getConversationContext(sessionId);
    const userPreferencesContext = contextData.find(c => c.context_type === 'user_preferences');
    
    const currentPreferences = userPreferencesContext?.context_data || {
      responseStyle: 'balanced',
      complexityLevel: 'intermediate',
      interests: []
    };

    // Adjust preferences based on feedback
    switch (feedback) {
      case 'too_long':
        // User prefers shorter responses
        if (currentPreferences.responseStyle === 'comprehensive') {
          currentPreferences.responseStyle = 'detailed';
        } else if (currentPreferences.responseStyle === 'detailed') {
          currentPreferences.responseStyle = 'balanced';
        } else if (currentPreferences.responseStyle === 'balanced') {
          currentPreferences.responseStyle = 'concise';
        }
        break;
        
      case 'too_short':
        // User prefers longer responses
        if (currentPreferences.responseStyle === 'concise') {
          currentPreferences.responseStyle = 'balanced';
        } else if (currentPreferences.responseStyle === 'balanced') {
          currentPreferences.responseStyle = 'detailed';
        } else if (currentPreferences.responseStyle === 'detailed') {
          currentPreferences.responseStyle = 'comprehensive';
        }
        break;
        
      case 'helpful':
        // Positive feedback - maintain current preferences
        // Could be used to reinforce current settings
        break;
        
      case 'off_topic':
        // User wants more focused responses
        // This could influence future context selection
        break;
    }

    // Update the conversation context with new preferences
    await conversationService.updateConversationContext(
      sessionId,
      'user_preferences',
      currentPreferences,
      0.85 // High confidence since this is direct user feedback
    );

    console.log('[Enhanced Feedback] Updated user preferences based on feedback:', {
      feedback,
      newResponseStyle: currentPreferences.responseStyle
    });

  } catch (error) {
    console.error('[Enhanced Feedback] Error updating user preferences:', error);
    // Don't throw - feedback recording should still succeed even if preference update fails
  }
} 