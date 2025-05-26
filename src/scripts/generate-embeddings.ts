import { createClient } from '@supabase/supabase-js';
import { generateEmbedding, storeEmbedding, initializePineconeIndex } from '../lib/ai/embeddings';

// This script generates embeddings for existing book chunks
// Run with: npx tsx src/scripts/generate-embeddings.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BookChunk {
  id: number;
  public_book_id: number;
  chunk_index: number;
  content: string;
}

async function generateEmbeddingsForBook(bookId: number) {
  console.log(`Starting embedding generation for book ${bookId}...`);

  // Fetch all chunks for the book
  const { data: chunks, error } = await supabase
    .from('book_chunks')
    .select('id, public_book_id, chunk_index, content')
    .eq('public_book_id', bookId)
    .order('chunk_index', { ascending: true })
    .returns<BookChunk[]>();

  if (error) {
    console.error('Error fetching chunks:', error);
    return;
  }

  if (!chunks || chunks.length === 0) {
    console.log(`No chunks found for book ${bookId}`);
    return;
  }

  console.log(`Found ${chunks.length} chunks for book ${bookId}`);

  // Process chunks in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);

    await Promise.all(
      batch.map(async (chunk) => {
        try {
          // Generate embedding
          const embedding = await generateEmbedding(chunk.content);
          
          // Create unique ID for Pinecone
          const pineconeId = `book_${chunk.public_book_id}_chunk_${chunk.chunk_index}`;
          
          // Store in Pinecone
          await storeEmbedding(pineconeId, embedding, {
            bookId: chunk.public_book_id,
            chunkIndex: chunk.chunk_index,
            content: chunk.content,
            bookType: 'public',
          });

          console.log(`✓ Generated embedding for chunk ${chunk.chunk_index}`);
        } catch (error) {
          console.error(`✗ Error processing chunk ${chunk.chunk_index}:`, error);
        }
      })
    );

    // Add delay between batches to respect rate limits
    if (i + batchSize < chunks.length) {
      console.log('Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`✓ Completed embedding generation for book ${bookId}`);
}

async function generateEmbeddingsForAllBooks() {
  console.log('Starting embedding generation for all books...');

  // Initialize Pinecone index
  try {
    await initializePineconeIndex();
    console.log('✓ Pinecone index initialized');
  } catch (error) {
    console.error('✗ Error initializing Pinecone index:', error);
    return;
  }

  // Get all unique book IDs
  const { data: books, error } = await supabase
    .from('book_chunks')
    .select('public_book_id')
    .order('public_book_id', { ascending: true });

  if (error) {
    console.error('Error fetching books:', error);
    return;
  }

  const uniqueBookIds = [...new Set(books?.map(book => book.public_book_id) || [])];
  console.log(`Found ${uniqueBookIds.length} books to process`);

  for (const bookId of uniqueBookIds) {
    await generateEmbeddingsForBook(bookId);
    
    // Add delay between books
    console.log('Waiting 5 seconds before next book...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('✓ Completed embedding generation for all books');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Generate embeddings for all books
    await generateEmbeddingsForAllBooks();
  } else if (args[0] === '--book' && args[1]) {
    // Generate embeddings for specific book
    const bookId = parseInt(args[1], 10);
    if (isNaN(bookId)) {
      console.error('Invalid book ID');
      process.exit(1);
    }
    
    await initializePineconeIndex();
    await generateEmbeddingsForBook(bookId);
  } else {
    console.log('Usage:');
    console.log('  npx tsx src/scripts/generate-embeddings.ts                 # Process all books');
    console.log('  npx tsx src/scripts/generate-embeddings.ts --book <id>     # Process specific book');
    process.exit(1);
  }
}

main().catch(console.error); 