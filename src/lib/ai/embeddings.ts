import { openai, pinecone, EMBEDDING_MODEL, PINECONE_INDEX_NAME, EMBEDDING_DIMENSIONS } from './config';

export interface EmbeddingMetadata {
  bookId: number;
  chunkIndex: number;
  content: string;
  userId?: string;
  bookType: 'public' | 'user';
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

export async function storeEmbedding(
  id: string,
  embedding: number[],
  metadata: EmbeddingMetadata
): Promise<void> {
  try {
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    await index.upsert([
      {
        id,
        values: embedding,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
        },
      },
    ]);
  } catch (error) {
    console.error('Error storing embedding:', error);
    throw new Error('Failed to store embedding');
  }
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  bookId: number,
  topK: number = 5,
  userId?: string
): Promise<Array<{ id: string; score: number; metadata: EmbeddingMetadata }>> {
  try {
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    const filter: Record<string, string | number> = { bookId };
    if (userId) {
      filter.userId = userId;
    }

    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter,
    });

    return queryResponse.matches?.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as unknown as EmbeddingMetadata,
    })) || [];
  } catch (error) {
    console.error('Error searching similar chunks:', error);
    throw new Error('Failed to search similar chunks');
  }
}

export async function initializePineconeIndex(): Promise<void> {
  try {
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some(index => index.name === PINECONE_INDEX_NAME);

    if (!indexExists) {
      await pinecone.createIndex({
        name: PINECONE_INDEX_NAME,
        dimension: EMBEDDING_DIMENSIONS,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      
      console.log(`Created Pinecone index: ${PINECONE_INDEX_NAME}`);
    }
  } catch (error) {
    console.error('Error initializing Pinecone index:', error);
    throw new Error('Failed to initialize Pinecone index');
  }
} 