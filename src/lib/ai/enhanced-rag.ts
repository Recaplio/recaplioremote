// Enhanced RAG System with Conversation Memory for Recaplio
// Integrates conversation persistence with intelligent context retrieval
import { generateRAGResponse, type RAGContext, type ChatMessage, getRelevantContext } from './rag';
import { conversationService, type ConversationMessage } from './conversation-service';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface EnhancedRAGContext extends RAGContext {
  sessionId?: string;
  conversationHistory?: ConversationMessage[];
  includeConversationMemory?: boolean;
}

export interface ConversationMemory {
  recentTopics: string[];
  userPreferences: {
    responseStyle: 'concise' | 'balanced' | 'detailed' | 'comprehensive';
    complexityLevel: 'beginner' | 'intermediate' | 'advanced';
    interests: string[];
  };
  readingProgress: {
    currentChapter?: number;
    keyInsights: string[];
    questionsAsked: string[];
  };
  relationshipContext: {
    conversationCount: number;
    userEngagement: 'low' | 'medium' | 'high';
    satisfactionScore: number;
  };
}

/**
 * Enhanced RAG response generation with conversation memory
 */
export async function generateEnhancedRAGResponse(
  query: string,
  context: EnhancedRAGContext
): Promise<{
  response: string;
  sessionId: string;
  messageId: string;
  conversationContext: ConversationMemory | null;
}> {
  console.log('[EnhancedRAG] Starting enhanced response generation with conversation memory');
  
  try {
    // Step 1: Get or create conversation session
    const session = await conversationService.getOrCreateActiveSession(
      context.userId,
      context.bookId,
      context.readingMode,
      context.knowledgeLens,
      context.userTier
    );

    console.log('[EnhancedRAG] Using conversation session:', session.id);

    // Step 2: Get conversation history if enabled
    let conversationHistory: ConversationMessage[] = [];
    if (context.includeConversationMemory !== false) {
      conversationHistory = await conversationService.getConversationHistory(
        session.id,
        20 // Last 20 messages for context
      );
      console.log('[EnhancedRAG] Retrieved conversation history:', conversationHistory.length, 'messages');
    }

    // Step 3: Build conversation memory context
    const conversationMemory = await buildConversationMemory(session.id, conversationHistory);
    console.log('[EnhancedRAG] Built conversation memory context');

    // Step 4: Add user message to conversation
    await conversationService.addMessage(
      session.id,
      'user',
      query,
      {
        chunkContext: context.currentChunkIndex,
        contextMetadata: {
          readingMode: context.readingMode,
          knowledgeLens: context.knowledgeLens,
          userTier: context.userTier
        },
        messageType: 'chat'
      }
    );

    // Step 5: Generate enhanced system prompt with conversation context AND book content
    const enhancedMessages = await buildEnhancedPrompt(
      query,
      context,
      conversationMemory,
      conversationHistory
    );

    console.log('[EnhancedRAG] Built enhanced prompt with conversation context and book content');

    // Step 6: Generate AI response
    const aiResponse = await generateAIResponseWithMemory(enhancedMessages, context);
    console.log('[EnhancedRAG] Generated AI response with memory integration');

    // Step 7: Add assistant message to conversation
    const assistantMessage = await conversationService.addMessage(
      session.id,
      'assistant',
      aiResponse,
      {
        chunkContext: context.currentChunkIndex,
        contextMetadata: {
          conversationMemory,
          generatedAt: new Date().toISOString()
        },
        messageType: 'chat',
        aiConfidenceScore: 0.85 // Could be calculated based on response quality
      }
    );

    // Step 8: Update conversation context with new insights
    await updateConversationInsights(session.id, query, aiResponse, conversationMemory);

    return {
      response: aiResponse,
      sessionId: session.id,
      messageId: assistantMessage.id,
      conversationContext: conversationMemory
    };

  } catch (error) {
    console.error('[EnhancedRAG] Error in enhanced response generation:', error);
    
    // Fallback to basic RAG if enhanced fails
    console.log('[EnhancedRAG] Falling back to basic RAG response');
    const fallbackResponse = await generateRAGResponse(query, context);
    
    return {
      response: fallbackResponse,
      sessionId: context.sessionId || 'fallback',
      messageId: 'fallback-' + Date.now(),
      conversationContext: null
    };
  }
}

/**
 * Build conversation memory from session history
 */
async function buildConversationMemory(
  sessionId: string,
  conversationHistory: ConversationMessage[]
): Promise<ConversationMemory> {
  // Extract recent topics from conversation
  const recentMessages = conversationHistory
    .filter(m => m.role === 'user')
    .slice(-10) // Last 10 user messages
    .map(m => m.content);

  const recentTopics = conversationService.extractTopicsFromMessages(recentMessages);

  // Get conversation context for additional insights
  const contextData = await conversationService.getConversationContext(sessionId);
  
  const userPreferencesContext = contextData.find(c => c.context_type === 'user_preferences');
  const readingProgressContext = contextData.find(c => c.context_type === 'reading_progress');

  // Type-safe context data extraction
  const userPrefsData = userPreferencesContext?.context_data as {
    responseStyle?: 'concise' | 'balanced' | 'detailed' | 'comprehensive';
    complexityLevel?: 'beginner' | 'intermediate' | 'advanced';
    interests?: string[];
  } | undefined;

  const readingProgressData = readingProgressContext?.context_data as {
    currentChapter?: number;
    keyInsights?: string[];
  } | undefined;

  // Build memory object
  const memory: ConversationMemory = {
    recentTopics,
    userPreferences: {
      responseStyle: userPrefsData?.responseStyle || 'balanced',
      complexityLevel: userPrefsData?.complexityLevel || 'intermediate',
      interests: userPrefsData?.interests || []
    },
    readingProgress: {
      currentChapter: readingProgressData?.currentChapter,
      keyInsights: readingProgressData?.keyInsights || [],
      questionsAsked: recentMessages.filter(m => m.includes('?')).slice(-5)
    },
    relationshipContext: {
      conversationCount: conversationHistory.length,
      userEngagement: conversationHistory.length > 20 ? 'high' : 
                     conversationHistory.length > 10 ? 'medium' : 'low',
      satisfactionScore: calculateSatisfactionScore(conversationHistory)
    }
  };

  return memory;
}

/**
 * Build enhanced prompt with conversation memory AND book content
 */
async function buildEnhancedPrompt(
  query: string,
  context: EnhancedRAGContext,
  conversationMemory: ConversationMemory,
  conversationHistory: ConversationMessage[]
): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [];

  // Step 1: Build personalized system prompt with memory
  const personalizedSystemPrompt = buildPersonalizedSystemPrompt(context, conversationMemory);
  messages.push({
    role: 'system',
    content: personalizedSystemPrompt
  });

  // Step 2: Get actual book content using existing RAG system
  console.log('[EnhancedRAG] Retrieving book content for context...');
  console.log('[EnhancedRAG] Context details:', {
    bookId: context.bookId,
    currentChunkIndex: context.currentChunkIndex,
    userId: context.userId?.substring(0, 8) + '...',
    query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
  });
  
  const bookContext = await getRelevantContext(query, context);
  
  if (bookContext.length > 0) {
    const contextMessage = `**Current Book Content:**\n\n${bookContext.join('\n\n---\n\n')}`;
    messages.push({
      role: 'system',
      content: contextMessage
    });
    console.log(`[EnhancedRAG] Added book content: ${bookContext.length} chunks`);
    console.log(`[EnhancedRAG] Total context length: ${contextMessage.length} characters`);
    console.log(`[EnhancedRAG] First chunk preview:`, bookContext[0]?.substring(0, 200) + '...');
  } else {
    console.warn('[EnhancedRAG] No book content retrieved - responses may be generic');
    console.warn('[EnhancedRAG] This means the AI cannot see the actual book text!');
  }

  // Step 3: Add conversation summary if we have enough history
  const conversationSummary = buildConversationSummary(conversationHistory, conversationMemory);
  if (conversationSummary) {
    messages.push({
      role: 'system',
      content: `**Our Conversation So Far:**\n${conversationSummary}`
    });
  }

  // Step 4: Add recent conversation history (last 6 messages for context)
  const recentHistory = conversationHistory.slice(-6);
  recentHistory.forEach(msg => {
    if (msg.role !== 'system') {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      });
    }
  });

  // Step 5: Add current user query
  messages.push({
    role: 'user',
    content: query
  });

  return messages;
}

/**
 * Generate AI response with memory integration
 */
async function generateAIResponseWithMemory(
  messages: ChatMessage[],
  context: EnhancedRAGContext
): Promise<string> {
  // Select model based on user tier
  const model = context.userTier === 'PRO' ? 'gpt-4-turbo' :
               context.userTier === 'PREMIUM' ? 'gpt-3.5-turbo-16k' :
               'gpt-3.5-turbo';

  // Adjust parameters based on tier
  const maxTokens = context.userTier === 'PRO' ? 1500 :
                   context.userTier === 'PREMIUM' ? 1000 :
                   600;

  const completion = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
  });

  return completion.choices[0]?.message?.content || 
         'I apologize, but I was unable to generate a response. Please try rephrasing your question.';
}

/**
 * Build personalized system prompt based on conversation memory
 */
function buildPersonalizedSystemPrompt(
  context: EnhancedRAGContext,
  memory: ConversationMemory
): string {
  const basePersonality = `You are Lio, Recaplio's AI Reading Companion - a wise and witty lion with a passion for great literature. You have been having an ongoing conversation with this reader and have gotten to know them well.`;

  // Personalization based on memory
  const personalizedElements = [];

  // Relationship context
  if (memory.relationshipContext.conversationCount > 5) {
    personalizedElements.push(
      `You've had ${memory.relationshipContext.conversationCount} exchanges with this reader, so you know their interests and style well.`
    );
  }

  // Response style adaptation
  const styleGuidance = {
    'concise': 'Keep your responses focused and to the point, as this reader prefers brevity.',
    'balanced': 'Provide thoughtful responses with good balance of depth and clarity.',
    'detailed': 'This reader enjoys comprehensive explanations, so feel free to elaborate.',
    'comprehensive': 'This reader loves in-depth analysis, so provide rich, scholarly insights.'
  };
  personalizedElements.push(styleGuidance[memory.userPreferences.responseStyle]);

  // Topic familiarity
  if (memory.recentTopics.length > 0) {
    personalizedElements.push(
      `You've been discussing: ${memory.recentTopics.slice(0, 3).join(', ')}. Build on these conversations naturally.`
    );
  }

  // Engagement level adaptation
  const engagementGuidance = {
    'high': 'This reader is highly engaged - feel free to pose thought-provoking questions and make connections.',
    'medium': 'This reader is moderately engaged - provide helpful insights while encouraging exploration.',
    'low': 'This reader may be new to deep literary discussion - be encouraging and accessible.'
  };
  personalizedElements.push(engagementGuidance[memory.relationshipContext.userEngagement]);

  return `${basePersonality}\n\n**Your Relationship with This Reader:**\n${personalizedElements.join('\n')}\n\n**Your Mission:** Continue building this relationship by providing insights that match their learning style and interests, while helping them discover new aspects of this wonderful book.`;
}

/**
 * Build conversation summary for context
 */
function buildConversationSummary(
  history: ConversationMessage[],
  memory: ConversationMemory
): string | null {
  if (history.length < 4) return null;

  const recentUserQuestions = history
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => `- "${m.content.substring(0, 60)}${m.content.length > 60 ? '...' : ''}"`)
    .join('\n');

  const topicsDiscussed = memory.recentTopics.slice(0, 4).join(', ');

  return `Recent questions from this reader:\n${recentUserQuestions}\n\nMain topics we've explored: ${topicsDiscussed}`;
}



/**
 * Update conversation insights based on new interaction
 */
async function updateConversationInsights(
  sessionId: string,
  userQuery: string,
  aiResponse: string,
  memory: ConversationMemory
): Promise<void> {
  try {
    // Extract topics from current interaction
    const currentTopics = conversationService.extractTopicsFromMessages([userQuery, aiResponse]);

    // Update topics discussed
    const updatedTopics = [...memory.recentTopics];
    currentTopics.forEach(topic => {
      if (!updatedTopics.includes(topic)) {
        updatedTopics.push(topic);
      }
    });

    await conversationService.updateConversationContext(
      sessionId,
      'topics_discussed',
      { topics: updatedTopics.slice(0, 20) }, // Keep top 20 topics
      0.85
    );

    // Update reading progress if relevant
    if (userQuery.toLowerCase().includes('chapter') || userQuery.toLowerCase().includes('section')) {
      await conversationService.updateConversationContext(
        sessionId,
        'reading_progress',
        {
          ...memory.readingProgress,
          lastQuestionAbout: userQuery,
          timestamp: new Date().toISOString()
        },
        0.80
      );
    }

    console.log('[EnhancedRAG] Updated conversation insights');
  } catch (error) {
    console.error('[EnhancedRAG] Error updating conversation insights:', error);
  }
}

/**
 * Calculate satisfaction score from conversation history
 */
function calculateSatisfactionScore(history: ConversationMessage[]): number {
  const feedbackMessages = history.filter(m => m.user_feedback);
  
  if (feedbackMessages.length === 0) return 0.75; // Default neutral score

  const scores = feedbackMessages.map(m => {
    switch (m.user_feedback) {
      case 'helpful': return 1.0;
      case 'too_long': return 0.6;
      case 'too_short': return 0.7;
      case 'off_topic': return 0.3;
      default: return 0.5;
    }
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
} 