// AI Conversation Service for Recaplio
// Manages persistent, intelligent conversations with Lio
import { createSupabaseAdminClient } from '@/utils/supabase/server';

export interface ConversationSession {
  id: string;
  user_id: string;
  user_book_id: number;
  session_title: string | null;
  reading_mode: 'fiction' | 'non-fiction';
  knowledge_lens: 'literary' | 'knowledge';
  user_tier: 'FREE' | 'PREMIUM' | 'PRO';
  is_active: boolean;
  last_interaction_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  chunk_context: number | null;
  context_metadata: Record<string, unknown>;
  message_type: 'chat' | 'quick_action' | 'feedback' | 'system';
  quick_action_id: string | null;
  user_feedback: 'helpful' | 'too_long' | 'too_short' | 'off_topic' | null;
  ai_confidence_score: number | null;
  token_count: number | null;
  created_at: string;
}

export interface ConversationContext {
  id: string;
  session_id: string;
  context_type: 'topics_discussed' | 'user_preferences' | 'reading_progress' | 'learning_insights';
  context_data: Record<string, unknown>;
  confidence_score: number;
  last_updated: string;
}

class ConversationService {
  private supabase = createSupabaseAdminClient();

  /**
   * Get or create an active conversation session for a user and book
   */
  async getOrCreateActiveSession(
    userId: string,
    userBookId: number,
    readingMode: 'fiction' | 'non-fiction',
    knowledgeLens: 'literary' | 'knowledge',
    userTier: 'FREE' | 'PREMIUM' | 'PRO'
  ): Promise<ConversationSession> {
    console.log('[ConversationService] Getting/creating active session:', {
      userId: userId.substring(0, 8) + '...',
      userBookId,
      readingMode,
      knowledgeLens,
      userTier
    });

    // First, try to find an existing active session
    const { data: existingSession, error: findError } = await this.supabase
      .from('ai_conversation_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('user_book_id', userBookId)
      .eq('is_active', true)
      .single();

    if (!findError && existingSession) {
      console.log('[ConversationService] Found existing active session:', existingSession.id);
      
      // Update session if mode or lens changed
      if (existingSession.reading_mode !== readingMode || 
          existingSession.knowledge_lens !== knowledgeLens ||
          existingSession.user_tier !== userTier) {
        
        const { data: updatedSession, error: updateError } = await this.supabase
          .from('ai_conversation_sessions')
          .update({
            reading_mode: readingMode,
            knowledge_lens: knowledgeLens,
            user_tier: userTier,
            last_interaction_at: new Date().toISOString()
          })
          .eq('id', existingSession.id)
          .select()
          .single();

        if (updateError) {
          console.error('[ConversationService] Error updating session:', updateError);
          return existingSession;
        }

        console.log('[ConversationService] Updated session with new mode/lens/tier');
        return updatedSession;
      }

      return existingSession;
    }

    // Create a new session
    console.log('[ConversationService] Creating new conversation session');
    
    const { data: newSession, error: createError } = await this.supabase
      .from('ai_conversation_sessions')
      .insert({
        user_id: userId,
        user_book_id: userBookId,
        reading_mode: readingMode,
        knowledge_lens: knowledgeLens,
        user_tier: userTier,
        is_active: true,
        session_title: null // Will be auto-generated later based on conversation
      })
      .select()
      .single();

    if (createError) {
      console.error('[ConversationService] Error creating session:', createError);
      throw new Error('Failed to create conversation session');
    }

    console.log('[ConversationService] Created new session:', newSession.id);
    return newSession;
  }

  /**
   * Add a message to a conversation session
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    options: {
      chunkContext?: number;
      contextMetadata?: Record<string, unknown>;
      messageType?: 'chat' | 'quick_action' | 'feedback' | 'system';
      quickActionId?: string;
      aiConfidenceScore?: number;
      tokenCount?: number;
    } = {}
  ): Promise<ConversationMessage> {
    console.log('[ConversationService] Adding message to session:', {
      sessionId,
      role,
      contentLength: content.length,
      messageType: options.messageType || 'chat'
    });

    const { data: message, error } = await this.supabase
      .from('ai_conversation_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        chunk_context: options.chunkContext || null,
        context_metadata: options.contextMetadata || {},
        message_type: options.messageType || 'chat',
        quick_action_id: options.quickActionId || null,
        ai_confidence_score: options.aiConfidenceScore || null,
        token_count: options.tokenCount || null
      })
      .select()
      .single();

    if (error) {
      console.error('[ConversationService] Error adding message:', error);
      throw new Error('Failed to add message to conversation');
    }

    console.log('[ConversationService] Added message:', message.id);
    return message;
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(
    sessionId: string,
    limit: number = 50,
    includeSystem: boolean = false
  ): Promise<ConversationMessage[]> {
    console.log('[ConversationService] Getting conversation history:', {
      sessionId,
      limit,
      includeSystem
    });

    let query = this.supabase
      .from('ai_conversation_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (!includeSystem) {
      query = query.in('role', ['user', 'assistant']);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('[ConversationService] Error getting conversation history:', error);
      throw new Error('Failed to get conversation history');
    }

    console.log('[ConversationService] Retrieved', messages?.length || 0, 'messages');
    return messages || [];
  }

  /**
   * Update conversation context with new insights
   */
  async updateConversationContext(
    sessionId: string,
    contextType: 'topics_discussed' | 'user_preferences' | 'reading_progress' | 'learning_insights',
    contextData: Record<string, unknown>,
    confidenceScore: number = 0.80
  ): Promise<void> {
    console.log('[ConversationService] Updating conversation context:', {
      sessionId,
      contextType,
      confidenceScore
    });

    const { error } = await this.supabase
      .from('ai_conversation_context')
      .upsert({
        session_id: sessionId,
        context_type: contextType,
        context_data: contextData,
        confidence_score: confidenceScore,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'session_id,context_type'
      });

    if (error) {
      console.error('[ConversationService] Error updating conversation context:', error);
      throw new Error('Failed to update conversation context');
    }

    console.log('[ConversationService] Updated conversation context successfully');
  }

  /**
   * Add user feedback to a message
   */
  async addMessageFeedback(
    messageId: string,
    feedback: 'helpful' | 'too_long' | 'too_short' | 'off_topic'
  ): Promise<void> {
    console.log('[ConversationService] Adding feedback to message:', {
      messageId,
      feedback
    });

    const { error } = await this.supabase
      .from('ai_conversation_messages')
      .update({ user_feedback: feedback })
      .eq('id', messageId);

    if (error) {
      console.error('[ConversationService] Error adding feedback:', error);
      throw new Error('Failed to add message feedback');
    }

    console.log('[ConversationService] Added feedback successfully');
  }

  /**
   * Get conversation context for intelligent responses
   */
  async getConversationContext(sessionId: string): Promise<ConversationContext[]> {
    const { data: context, error } = await this.supabase
      .from('ai_conversation_context')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      console.error('[ConversationService] Error getting conversation context:', error);
      return [];
    }

    return context || [];
  }

  /**
   * Get recent conversations for a user across all books
   */
  async getRecentConversations(
    userId: string,
    limit: number = 10
  ): Promise<ConversationSession[]> {
    const { data: sessions, error } = await this.supabase
      .from('ai_conversation_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_interaction_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ConversationService] Error getting recent conversations:', error);
      return [];
    }

    return sessions || [];
  }

  /**
   * Extract topics from conversation for context building
   */
  extractTopicsFromMessages(messages: string[]): string[] {
    const topics: string[] = [];
    const topicKeywords = [
      'character', 'theme', 'plot', 'setting', 'symbolism', 'meaning',
      'author', 'style', 'chapter', 'book', 'story', 'analysis',
      'concept', 'idea', 'argument', 'theory', 'framework'
    ];

    messages.forEach(message => {
      const words = message.toLowerCase().split(/\s+/);
      topicKeywords.forEach(keyword => {
        if (words.some(word => word.includes(keyword)) && !topics.includes(keyword)) {
          topics.push(keyword);
        }
      });
    });

    return topics;
  }
}

export const conversationService = new ConversationService();
