import { openai, AI_MODELS, MAX_CONTEXT_CHUNKS } from './config';
import { generateEmbedding, searchSimilarChunks } from './embeddings';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/utils/supabase/server';
import { 
  type UserTier, 
  type ReadingMode, 
  type KnowledgeLens, 
  analyzeQueryComplexity,
  extractTopicsFromQuery
} from './client-utils';

export { type UserTier, type ReadingMode, type KnowledgeLens } from './client-utils';

export interface RAGContext {
  bookId: number;
  currentChunkIndex?: number;
  userTier: UserTier;
  readingMode: ReadingMode;
  knowledgeLens: KnowledgeLens;
  userId: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Enhanced user learning profile interface
export interface UserLearningProfile {
  id: string;
  user_id: string;
  preferred_response_style: 'concise' | 'detailed' | 'comprehensive';
  learning_pace: 'quick' | 'moderate' | 'thorough';
  interests: string[]; // e.g., ['character_development', 'themes', 'historical_context']
  reading_goals: string[]; // e.g., ['academic', 'pleasure', 'research']
  interaction_history: {
    total_questions: number;
    favorite_topics: string[];
    complexity_preference: 'simple' | 'moderate' | 'advanced';
  };
  created_at: string;
  updated_at: string;
}

export async function getCurrentChunkContent(
  bookId: number,
  chunkIndex: number
): Promise<string | null> {
  try {
    // Use admin client to bypass RLS issues
    const adminSupabase = createSupabaseAdminClient();
    
    console.log('[RAG] Fetching current chunk content:', { bookId, chunkIndex });
    
    const { data: chunk, error } = await adminSupabase
      .from('book_chunks')
      .select('content')
      .eq('public_book_id', bookId)
      .eq('chunk_index', chunkIndex)
      .single();

    if (error) {
      console.error('[RAG] Error fetching current chunk:', error);
      
      // Try alternative query in case the chunk_index is off by one
      console.log('[RAG] Trying alternative chunk index queries...');
      
      // Try chunk_index - 1 and chunk_index + 1
      for (const altIndex of [chunkIndex - 1, chunkIndex + 1]) {
        if (altIndex >= 0) {
          const { data: altChunk, error: altError } = await adminSupabase
            .from('book_chunks')
            .select('content')
            .eq('public_book_id', bookId)
            .eq('chunk_index', altIndex)
            .single();
          
          if (!altError && altChunk) {
            console.log(`[RAG] Found content at alternative chunk index ${altIndex}`);
            return altChunk.content;
          }
        }
      }
      
      return null;
    }

    if (!chunk || !chunk.content) {
      console.warn('[RAG] Chunk found but no content available');
      return null;
    }

    console.log('[RAG] Successfully fetched chunk content, length:', chunk.content.length);
    return chunk.content;
  } catch (error) {
    console.error('[RAG] Error getting current chunk content:', error);
    return null;
  }
}

export async function getRelevantContext(
  query: string,
  context: RAGContext
): Promise<string[]> {
  const relevantChunks: string[] = [];

  // Always try to include current chunk content if available
  if (context.currentChunkIndex !== undefined) {
    console.log(`[RAG] Attempting to fetch current chunk ${context.currentChunkIndex} for book ${context.bookId}`);
    const currentContent = await getCurrentChunkContent(context.bookId, context.currentChunkIndex);
    if (currentContent) {
      relevantChunks.push(`[Current Page/Chunk ${context.currentChunkIndex + 1}]\n${currentContent}`);
      console.log(`[RAG] Successfully included current chunk content (${currentContent.length} chars)`);
    } else {
      console.warn(`[RAG] Could not retrieve current chunk ${context.currentChunkIndex} for book ${context.bookId}`);
    }
  } else {
    console.log('[RAG] No current chunk index provided');
  }

  // Try to get additional context from embeddings
  try {
    console.log('[RAG] Searching for additional relevant context via embeddings...');
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for similar chunks (excluding current chunk if it's already included)
    const maxAdditionalChunks = MAX_CONTEXT_CHUNKS - (relevantChunks.length > 0 ? 1 : 0);
    const similarChunks = await searchSimilarChunks(
      queryEmbedding,
      context.bookId,
      maxAdditionalChunks,
      context.userId
    );

    // Add similar chunks, excluding the current one if already included
    const additionalChunks = similarChunks
      .filter(chunk => chunk.metadata.chunkIndex !== context.currentChunkIndex)
      .map(chunk => `[Related Content - Chunk ${chunk.metadata.chunkIndex + 1}]\n${chunk.metadata.content}`);
    
    relevantChunks.push(...additionalChunks);
    console.log(`[RAG] Added ${additionalChunks.length} additional relevant chunks from embeddings`);
  } catch (error) {
    console.error('[RAG] Error getting relevant context from embeddings:', error);
    // Continue with just the current chunk if embeddings fail
  }

  console.log(`[RAG] Total relevant chunks assembled: ${relevantChunks.length}`);
  return relevantChunks;
}

export function buildSystemPrompt(context: RAGContext, userProfile?: UserLearningProfile | null): string {
  const { readingMode, knowledgeLens, userTier } = context;
  
  // Core Lio AI personality
  let basePrompt = `You are Lio, Recaplio's AI Reading Companion - a wise and witty lion with a passion for great literature. You combine the majesty of a lion with the curiosity of a scholar, making classic books accessible and exciting for readers of all ages.

**Your Core Identity as Lio:**
- You're a sophisticated lion who's spent centuries in the world's greatest libraries
- You have a sharp wit and gentle humor that makes learning enjoyable without being silly
- You're patient and encouraging, like a wise mentor who genuinely cares about each reader's journey
- You balance intellectual depth with approachable warmth - serious when needed, playful when appropriate
- You occasionally use subtle lion-themed expressions naturally (but never forced or over-the-top)

**Your Mission:**
Help readers unlock the treasures hidden within classic literature, one page at a time. You're not just answering questions - you're cultivating a lifelong love of reading and learning.

**Your Communication Style:**
- Professional yet personable, like a favorite professor who happens to be a lion
- Use "we" when exploring ideas together ("Let's examine..." "We can see...")
- Occasionally reference your unique perspective as a literary lion, but keep it natural
- End responses with gentle encouragement that invites further exploration

`;

  // Add personalized elements based on user profile
  if (userProfile) {
    const { preferred_response_style, learning_pace, interaction_history } = userProfile;
    
    basePrompt += `**Your Approach for This Reader:**
- Response Style: Adapt to their preference for ${preferred_response_style} explanations
- Learning Pace: They prefer a ${learning_pace} exploration of concepts
- Experience Level: Based on ${interaction_history.total_questions} previous conversations, adjust complexity to ${interaction_history.complexity_preference}
- Favorite Topics: They've shown interest in ${interaction_history.favorite_topics.join(', ') || 'various aspects of literature'}

`;
  }

  // Add tier-specific capabilities with flexible response lengths
  switch (userTier) {
    case 'FREE':
      basePrompt += `**Your Capabilities (Free Tier):**
- Provide clear, focused insights that respect the reader's time while being complete
- Offer essential wisdom and key points with warmth and encouragement
- Adapt response length based on query complexity (1-3 paragraphs)
- Always ensure your responses feel complete and satisfying, never cut off mid-thought

`;
      break;
    case 'PREMIUM':
      basePrompt += `**Your Capabilities (Premium Tier):**
- Provide rich, detailed analysis with deeper insights and connections
- Offer comprehensive explanations with examples and context
- Adapt response length dynamically (2-5 paragraphs based on complexity)
- Include nuanced interpretations and thoughtful connections between ideas
- Provide enhanced learning support with personalized recommendations

`;
      break;
    case 'PRO':
      basePrompt += `**Your Capabilities (Pro Tier):**
- Deliver sophisticated, professional-grade literary analysis and insights
- Provide comprehensive, multi-layered responses with scholarly depth
- Adapt response length freely (3-8 paragraphs based on query complexity and reader needs)
- Offer advanced interpretations, cross-textual references, and original insights
- Include connections to literary theory and broader cultural contexts when relevant
- Provide personalized learning paths and advanced study recommendations

`;
      break;
  }

  // Add reading mode and knowledge lens guidance
  if (readingMode === 'fiction') {
    basePrompt += `**Literary Focus (Fiction):**
You're guiding someone through a work of fiction. `;
    
    if (knowledgeLens === 'literary') {
      basePrompt += `Emphasize literary elements: character development, narrative techniques, themes, symbolism, style, and the author's craft. Help them appreciate the artistry and deeper meanings within the story.`;
    } else {
      basePrompt += `Focus on extracting wisdom and insights: life lessons, human nature, practical wisdom, historical context, and how the story's insights apply to understanding the world and personal growth.`;
    }
  } else {
    basePrompt += `**Analytical Focus (Non-Fiction):**
You're guiding someone through a non-fiction work. `;
    
    if (knowledgeLens === 'literary') {
      basePrompt += `Analyze the author's rhetorical strategies, writing style, argument structure, and persuasive techniques. Help them understand how the author crafts their message and engages readers.`;
    } else {
      basePrompt += `Focus on core concepts, evidence evaluation, practical applications, and critical analysis. Help them extract actionable knowledge and develop critical thinking about the ideas presented.`;
    }
  }

  basePrompt += `

**Response Guidelines:**
- Always reference specific content from the provided context, mentioning which section you're drawing from
- Use a warm, encouraging tone that makes literature feel accessible and exciting
- Structure responses clearly with natural flow and logical organization
- If you don't have sufficient context, acknowledge this gracefully and suggest what additional information would help
- End responses in a way that encourages further exploration and questions
- Adapt your response length to match the complexity and depth needed for the specific query
- Remember: you're Lio, nurturing a love of literature and learning with the wisdom of a literary lion

**Context Awareness:**
Use the provided excerpts from the book to give precise, contextual responses. When referencing content, indicate which section it comes from to help the reader navigate back to specific passages.`;

  return basePrompt;
}

export function buildContextualPrompt(
  query: string,
  relevantChunks: string[],
  context: RAGContext,
  userProfile?: UserLearningProfile | null
): ChatMessage[] {
  const systemPrompt = buildSystemPrompt(context, userProfile);
  
  let contextText = '';
  let hasCurrentChunk = false;
  
  if (relevantChunks.length > 0) {
    // Check if we have current chunk content
    hasCurrentChunk = relevantChunks.some(chunk => chunk.includes('[Current Page/Chunk'));
    
    contextText = `\n\n**Relevant Book Content:**\n${relevantChunks.join('\n\n---\n\n')}`;
    
    if (hasCurrentChunk) {
      contextText += `\n\n**IMPORTANT**: The content marked as "[Current Page/Chunk X]" is what the reader is currently viewing. When answering questions like "summarize this chapter" or "what's happening here", prioritize this current content. For other questions, you can draw from all provided content but always mention which section you're referencing.`;
    }
  } else {
    contextText = `\n\n**Note:** I don't have access to the specific content you're currently reading. Please share a passage or provide more context so I can give you the most helpful, specific guidance.`;
  }

  // Add dynamic response structure guidance based on query complexity and user profile
  const queryComplexity = analyzeQueryComplexity(query);
  const responseStyle = userProfile?.preferred_response_style || 'detailed';
  
  let structureGuidance = '\n\n**Response Structure:** ';
  
  if (queryComplexity === 'simple') {
    switch (responseStyle) {
      case 'concise':
        structureGuidance += 'Provide a clear, focused answer in 1-2 paragraphs. Be direct but warm.';
        break;
      case 'detailed':
        structureGuidance += 'Give a thorough but accessible explanation in 2-3 paragraphs with examples.';
        break;
      case 'comprehensive':
        structureGuidance += 'Provide a complete exploration in 2-4 paragraphs with context and connections.';
        break;
    }
  } else if (queryComplexity === 'moderate') {
    switch (responseStyle) {
      case 'concise':
        structureGuidance += 'Organize your response in 2-3 focused paragraphs covering the key points clearly.';
        break;
      case 'detailed':
        structureGuidance += 'Structure your analysis in 3-4 well-developed paragraphs with examples and insights.';
        break;
      case 'comprehensive':
        structureGuidance += 'Provide a thorough exploration in 4-6 paragraphs covering multiple dimensions of the topic.';
        break;
    }
  } else { // advanced
    switch (responseStyle) {
      case 'concise':
        structureGuidance += 'Deliver a sophisticated but focused analysis in 3-4 paragraphs, prioritizing the most important insights.';
        break;
      case 'detailed':
        structureGuidance += 'Provide a comprehensive analysis in 4-6 paragraphs with deep insights and scholarly connections.';
        break;
      case 'comprehensive':
        structureGuidance += 'Deliver a thorough, multi-layered exploration in 5-8 paragraphs covering all relevant dimensions and connections.';
        break;
    }
  }

  const fullSystemPrompt = systemPrompt + contextText + structureGuidance;

  return [
    {
      role: 'system',
      content: fullSystemPrompt
    },
    {
      role: 'user',
      content: query
    }
  ];
}

function getDynamicTokenLimit(
  query: string, 
  context: RAGContext, 
  userProfile?: UserLearningProfile | null
): number {
  // Base limits by tier - now more flexible
  const baseLimits = {
    'FREE': { min: 200, max: 500 },
    'PREMIUM': { min: 300, max: 800 },
    'PRO': { min: 400, max: 1200 }
  };

  const tierLimits = baseLimits[context.userTier];
  const queryComplexity = analyzeQueryComplexity(query);
  const responseStyle = userProfile?.preferred_response_style || 'detailed';

  // Calculate base allocation
  let baseAllocation = tierLimits.min;
  
  // Adjust for query complexity
  if (queryComplexity === 'simple') {
    baseAllocation = tierLimits.min;
  } else if (queryComplexity === 'moderate') {
    baseAllocation = Math.floor((tierLimits.min + tierLimits.max) * 0.6);
  } else { // advanced
    baseAllocation = Math.floor(tierLimits.max * 0.8);
  }

  // Adjust for user's preferred response style
  const styleMultipliers = {
    'concise': 0.8,
    'detailed': 1.0,
    'comprehensive': 1.3
  };

  const finalLimit = Math.floor(baseAllocation * styleMultipliers[responseStyle]);
  
  // Ensure we stay within tier bounds
  return Math.max(tierLimits.min, Math.min(tierLimits.max, finalLimit));
}

export async function generateRAGResponse(
  query: string,
  context: RAGContext
): Promise<string> {
  try {
    console.log('[RAG] Starting enhanced response generation with user personalization');
    console.log('[RAG] Context:', { 
      bookId: context.bookId, 
      currentChunkIndex: context.currentChunkIndex,
      userTier: context.userTier,
      readingMode: context.readingMode,
      knowledgeLens: context.knowledgeLens
    });
    
    // Get user learning profile
    const userProfile = await getUserLearningProfile(context.userId);
    console.log('[RAG] User profile loaded:', userProfile ? 'Found' : 'Creating default');

    // FIXED: Use getRelevantContext instead of generic search to include current chunk
    const relevantChunks = await getRelevantContext(query, context);
    console.log(`[RAG] Found ${relevantChunks.length} relevant chunks (including current context)`);

    // Build contextual prompt with personalization
    const messages = buildContextualPrompt(query, relevantChunks, context, userProfile);

    // Get optimal token limit for this query and user
    const maxTokens = getDynamicTokenLimit(query, context, userProfile);
    console.log(`[RAG] Using dynamic token limit: ${maxTokens}`);

    // Select model based on user tier
    const model = AI_MODELS[context.userTier];

    // Generate response with enhanced model
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7, // Slightly higher for more engaging responses
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try rephrasing your question.';

    // Update user learning profile based on this interaction
    await updateLearningProfile(context.userId, query, 'chat_response');
    console.log('[RAG] User learning profile updated');

    return response;

  } catch (error) {
    console.error('[RAG] Error generating enhanced response:', error);
    
    // Fallback response with Lio's personality
    return `*Lio pauses thoughtfully, his tail swishing*

I apologize, but I'm having a bit of trouble accessing my full literary prowess at the moment. Even the most well-read lions encounter the occasional challenge!

Could you try rephrasing your question or perhaps share a specific passage you'd like to explore? I'm eager to help you uncover the treasures within this book once we get back on track. 🦁📚`;
  }
}

export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const supabase = createSupabaseServerClient();
    
    // Development override - check environment variable first
    const devTierOverride = process.env.DEV_USER_TIER_OVERRIDE;
    if (devTierOverride && ['FREE', 'PREMIUM', 'PRO'].includes(devTierOverride)) {
      return devTierOverride as UserTier;
    }

    // Check for development tier override in cookies (for individual user testing)
    const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const devTierCookie = cookieStore.get('dev_user_tier');
        
        if (devTierCookie && ['FREE', 'PREMIUM', 'PRO'].includes(devTierCookie.value)) {
          return devTierCookie.value as UserTier;
        }
      } catch {
        // Cookies might not be available in this context, continue with other methods
      }
    }

    // Get user to check metadata
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata?.tier) {
      const metadataTier = user.user_metadata.tier;
      if (['FREE', 'PREMIUM', 'PRO'].includes(metadataTier)) {
        return metadataTier as UserTier;
      }
    }

    // Try to check subscriptions table (production)
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (subscription) {
        switch (subscription.plan_id) {
          case 'premium':
            return 'PREMIUM';
          case 'pro':
            return 'PRO';
          default:
            return 'FREE';
        }
      }
    } catch {
      console.log('Subscriptions table not available, using fallback tier detection');
    }

    return 'FREE'; // Default to free tier
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'FREE'; // Default to free tier on error
  }
}

// Enhanced user learning profile functions
export async function getUserLearningProfile(userId: string): Promise<UserLearningProfile | null> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: profile, error } = await supabase
      .from('user_learning_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user learning profile:', error);
      return null;
    }

    return profile || null;
  } catch (error) {
    console.error('Error getting user learning profile:', error);
    return null;
  }
}

export async function createDefaultLearningProfile(userId: string): Promise<UserLearningProfile> {
  const supabase = createSupabaseServerClient();
  
  const defaultProfile: Omit<UserLearningProfile, 'id' | 'created_at' | 'updated_at'> = {
    user_id: userId,
    preferred_response_style: 'detailed',
    learning_pace: 'moderate',
    interests: [],
    reading_goals: [],
    interaction_history: {
      total_questions: 0,
      favorite_topics: [],
      complexity_preference: 'moderate'
    }
  };

  const { data: profile, error } = await supabase
    .from('user_learning_profiles')
    .insert(defaultProfile)
    .select()
    .single();

  if (error) {
    console.error('Error creating default learning profile:', error);
    throw new Error('Failed to create learning profile');
  }

  return profile;
}

export async function updateLearningProfile(
  userId: string, 
  query: string, 
  responseType: string,
  userFeedback?: 'helpful' | 'too_long' | 'too_short' | 'off_topic'
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get current profile
    let profile = await getUserLearningProfile(userId);
    if (!profile) {
      profile = await createDefaultLearningProfile(userId);
    }

    // Analyze query to extract topics and complexity
    const topics = extractTopicsFromQuery(query);
    const complexity = analyzeQueryComplexity(query);

    // Update interaction history
    const updatedHistory = {
      total_questions: profile.interaction_history.total_questions + 1,
      favorite_topics: updateFavoriteTopics(profile.interaction_history.favorite_topics, topics),
      complexity_preference: adaptComplexityPreference(
        profile.interaction_history.complexity_preference, 
        complexity, 
        userFeedback
      )
    };

    // Adapt response style based on feedback
    let updatedResponseStyle = profile.preferred_response_style;
    if (userFeedback === 'too_long' && profile.preferred_response_style !== 'concise') {
      updatedResponseStyle = profile.preferred_response_style === 'comprehensive' ? 'detailed' : 'concise';
    } else if (userFeedback === 'too_short' && profile.preferred_response_style !== 'comprehensive') {
      updatedResponseStyle = profile.preferred_response_style === 'concise' ? 'detailed' : 'comprehensive';
    }

    // Update profile in database
    await supabase
      .from('user_learning_profiles')
      .update({
        preferred_response_style: updatedResponseStyle,
        interaction_history: updatedHistory,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

  } catch (error) {
    console.error('Error updating learning profile:', error);
  }
}

function updateFavoriteTopics(currentTopics: string[], newTopics: string[]): string[] {
  const topicCounts = new Map<string, number>();
  
  // Count existing topics
  currentTopics.forEach(topic => {
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  });
  
  // Add new topics
  newTopics.forEach(topic => {
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  });
  
  // Return top 5 most frequent topics
  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
}

function adaptComplexityPreference(
  current: 'simple' | 'moderate' | 'advanced',
  queryComplexity: 'simple' | 'moderate' | 'advanced',
  feedback?: 'helpful' | 'too_long' | 'too_short' | 'off_topic'
): 'simple' | 'moderate' | 'advanced' {
  if (feedback === 'helpful') {
    // User found the response helpful, lean towards the query complexity
    if (queryComplexity === current) return current;
    if (Math.abs(['simple', 'moderate', 'advanced'].indexOf(queryComplexity) - 
                 ['simple', 'moderate', 'advanced'].indexOf(current)) === 1) {
      return queryComplexity;
    }
  }
  
  return current;
}

// Export alias for backward compatibility
export const generateAIResponse = generateRAGResponse; 