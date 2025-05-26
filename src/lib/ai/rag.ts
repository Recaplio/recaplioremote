import { openai, AI_MODELS, MAX_CONTEXT_CHUNKS } from './config';
import { generateEmbedding, searchSimilarChunks } from './embeddings';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export type UserTier = 'FREE' | 'PREMIUM' | 'PRO';
export type ReadingMode = 'fiction' | 'non-fiction';
export type KnowledgeLens = 'literary' | 'knowledge';

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

export async function getCurrentChunkContent(
  bookId: number,
  chunkIndex: number
): Promise<string | null> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: chunk, error } = await supabase
      .from('book_chunks')
      .select('content')
      .eq('public_book_id', bookId)
      .eq('chunk_index', chunkIndex)
      .single();

    if (error || !chunk) {
      console.error('Error fetching current chunk:', error);
      return null;
    }

    return chunk.content;
  } catch (error) {
    console.error('Error getting current chunk content:', error);
    return null;
  }
}

export async function getRelevantContext(
  query: string,
  context: RAGContext
): Promise<string[]> {
  const relevantChunks: string[] = [];

  // Always include current chunk content if available
  if (context.currentChunkIndex !== undefined) {
    const currentContent = await getCurrentChunkContent(context.bookId, context.currentChunkIndex);
    if (currentContent) {
      relevantChunks.push(`[Current Page/Chunk ${context.currentChunkIndex + 1}]\n${currentContent}`);
    }
  }

  // Try to get additional context from embeddings
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for similar chunks (excluding current chunk if it's already included)
    const similarChunks = await searchSimilarChunks(
      queryEmbedding,
      context.bookId,
      MAX_CONTEXT_CHUNKS - (relevantChunks.length > 0 ? 1 : 0), // Leave room for current chunk
      context.userId
    );

    // Add similar chunks, excluding the current one if already included
    const additionalChunks = similarChunks
      .filter(chunk => chunk.metadata.chunkIndex !== context.currentChunkIndex)
      .map(chunk => `[Related Content - Chunk ${chunk.metadata.chunkIndex + 1}]\n${chunk.metadata.content}`);
    
    relevantChunks.push(...additionalChunks);
  } catch (error) {
    console.error('Error getting relevant context from embeddings:', error);
    // Continue with just the current chunk if embeddings fail
  }

  return relevantChunks;
}

export function buildSystemPrompt(context: RAGContext): string {
  const { readingMode, knowledgeLens, userTier } = context;
  
  let basePrompt = `You are an intelligent reading assistant helping users understand and analyze books. `;
  
  // Add tier-specific instructions with response length guidance
  switch (userTier) {
    case 'FREE':
      basePrompt += `Provide clear, concise responses in 1-2 paragraphs maximum. Keep summaries brief and focus on key points. Always complete your thoughts within your response limit. `;
      break;
    case 'PREMIUM':
      basePrompt += `Provide detailed, insightful responses in 2-3 paragraphs maximum. Offer comprehensive summaries and deeper analysis. Structure your response to ensure you complete all key points within your limit. `;
      break;
    case 'PRO':
      basePrompt += `Provide professional-grade, sophisticated analysis in 3-4 paragraphs maximum. Offer comprehensive insights, critical thinking, and nuanced interpretations. Organize your response to cover all important aspects while staying within your response limit. `;
      break;
  }

  // Add reading mode instructions
  if (readingMode === 'fiction') {
    basePrompt += `You are analyzing a work of fiction. `;
  } else {
    basePrompt += `You are analyzing a non-fiction work. `;
  }

  // Add knowledge lens instructions
  if (knowledgeLens === 'literary') {
    basePrompt += `Focus on literary elements: characters, themes, motifs, narrative structure, symbolism, and author's style. `;
  } else {
    basePrompt += `Focus on knowledge extraction: arguments, takeaways, concepts, frameworks, logical flow, evidence, and critical evaluation. `;
  }

  basePrompt += `Use the provided context from the book to answer questions accurately. When referencing specific content, mention which chunk or page it comes from. If you don't have enough context, say so clearly. 

IMPORTANT: Always structure your response to be complete within your token limit. If discussing multiple points, prioritize the most important ones and ensure you finish each point you start. Never end mid-sentence or mid-thought.`;

  return basePrompt;
}

export function buildContextualPrompt(
  query: string,
  relevantChunks: string[],
  context: RAGContext
): ChatMessage[] {
  const systemPrompt = buildSystemPrompt(context);
  
  let contextText = '';
  if (relevantChunks.length > 0) {
    contextText = `\n\nRelevant excerpts from the book:\n${relevantChunks.join('\n\n---\n\n')}`;
  } else {
    contextText = `\n\nNote: I don't have access to the specific content you're currently reading. Please provide some context or quote specific passages you'd like me to analyze.`;
  }

  // Add response structure guidance based on user tier
  let structureGuidance = '';
  switch (context.userTier) {
    case 'FREE':
      structureGuidance = `\n\nResponse Structure: Provide a focused answer in 1-2 short paragraphs. If listing points, limit to 2-3 key items.`;
      break;
    case 'PREMIUM':
      structureGuidance = `\n\nResponse Structure: Organize your answer in 2-3 paragraphs or 3-5 key points. Ensure each section is complete.`;
      break;
    case 'PRO':
      structureGuidance = `\n\nResponse Structure: Provide a comprehensive analysis in 3-4 well-developed paragraphs or 4-6 detailed points. Plan your response to cover all aspects thoroughly while staying complete.`;
      break;
  }

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt + contextText + structureGuidance,
    },
    {
      role: 'user',
      content: query,
    },
  ];

  return messages;
}

function getOptimalTokenLimit(query: string, context: RAGContext): number {
  // Base token limits by tier
  const baseLimits = {
    'FREE': 300,
    'PREMIUM': 500,
    'PRO': 800
  };

  let baseLimit = baseLimits[context.userTier];

  // Adjust based on query complexity
  const queryLower = query.toLowerCase();
  
  // Simple queries can use fewer tokens
  if (queryLower.includes('summarize') || queryLower.includes('what is') || queryLower.includes('who is')) {
    return Math.max(200, Math.floor(baseLimit * 0.8));
  }
  
  // Complex analysis queries need more tokens
  if (queryLower.includes('analyze') || queryLower.includes('compare') || queryLower.includes('explain why') || queryLower.includes('themes')) {
    return baseLimit;
  }
  
  // List-based queries need moderate tokens
  if (queryLower.includes('list') || queryLower.includes('main points') || queryLower.includes('key concepts')) {
    return Math.floor(baseLimit * 0.9);
  }

  return baseLimit;
}

export async function generateAIResponse(
  query: string,
  context: RAGContext,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  try {
    // Get relevant context from the book
    const relevantChunks = await getRelevantContext(query, context);
    
    // Build the prompt with context
    const messages = buildContextualPrompt(query, relevantChunks, context);
    
    // Add conversation history if provided (keep last 6 messages to stay within token limits)
    const recentHistory = conversationHistory.slice(-6);
    const allMessages = [...recentHistory, ...messages];

    // Select model based on user tier
    const model = AI_MODELS[context.userTier];

    // Get optimal token limit for this query
    const maxTokens = getOptimalTokenLimit(query, context);

    // Generate response
    const response = await openai.chat.completions.create({
      model,
      messages: allMessages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'I apologize, but I could not generate a response at this time.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate AI response');
  }
}

export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return 'FREE';
    }

    switch (subscription.plan_id) {
      case 'premium':
        return 'PREMIUM';
      case 'pro':
        return 'PRO';
      default:
        return 'FREE';
    }
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'FREE'; // Default to free tier on error
  }
} 