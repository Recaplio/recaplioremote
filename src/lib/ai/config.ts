import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// OpenAI Configuration
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Pinecone Configuration
export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

// AI Model Configuration based on user tiers
export const AI_MODELS = {
  FREE: 'gpt-4o-mini',
  PREMIUM: 'gpt-4o',
  PRO: 'gpt-4o'
} as const;

// Embedding Configuration
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

// Pinecone Index Configuration
export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'recaplio-embeddings';

// Chunk Configuration
export const CHUNK_SIZE = 500; // tokens
export const CHUNK_OVERLAP = 50; // tokens

// RAG Configuration
export const MAX_CONTEXT_CHUNKS = 5;
export const SIMILARITY_THRESHOLD = 0.7; 