import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/utils/supabase/server'; // Using admin client for all DB ops here
// Removed Tiktoken import: import { get_encoding } from 'tiktoken';
// import { yourMoreAdvancedCleanFn } from '@/utils/textCleaning'; // Placeholder for your cleaning function
// import { yourMoreAdvancedChunkFn } from '@/utils/textChunking'; // Placeholder for your chunking function

// --- Removed getTiktokenEncoderInstance function ---

// --- Revised Text Cleaning & Extraction ---

function extractBookContent(text: string): string {
  // Regex to find common Gutenberg start and end markers.
  // It looks for "*** START OF..." and "*** END OF..."
  // The (?:.|\n) or [\s\S] is used to match any character including newlines if /s flag isn't available/desired.
  const startRegex = /\*{3}\s*START OF (?:THIS|THE) PROJECT GUTENBERG EBOOK[\s\S]*?\s*\*{3}/i;
  const endRegex = /\*{3}\s*END OF (?:THIS|THE) PROJECT GUTENBERG EBOOK[\s\S]*?\s*\*{3}/i;

  let startIndex = 0;
  const startIndexMatch = text.match(startRegex);
  if (startIndexMatch && startIndexMatch.index !== undefined) {
    startIndex = startIndexMatch.index + startIndexMatch[0].length;
  } else {
    console.warn("Could not find precise Gutenberg START marker. Attempting to clean full text.");
    // If no start marker, we might still want to clean the whole text, 
    // or decide on a different fallback (e.g., return text as is, or error out).
    // For now, we'll proceed with startIndex = 0, implying the whole text if no marker.
  }

  let endIndex = text.length;
  const endIndexMatch = text.match(endRegex);
  if (endIndexMatch && endIndexMatch.index !== undefined) {
    endIndex = endIndexMatch.index;
  } else {
    console.warn("Could not find precise Gutenberg END marker. Using full text length.");
    // If no end marker, proceed with endIndex = text.length.
  }
  
  // Basic sanity check for indices
  if (startIndex >= endIndex && text.length > 0) {
      console.warn("Gutenberg start/end marker logic resulted in empty or invalid content range. Using full text for cleaning.");
      return text; // Fallback to processing the whole text if markers are confusing
  }

  return text.substring(startIndex, endIndex);
}

function cleanBookTextRevised(fullText: string): string {
  // First, try to extract the core content between Gutenberg markers
  let content = extractBookContent(fullText);

  // Apply further cleaning to the extracted (or full, if markers failed) content:
  // 1. Normalize line breaks (important for paragraph splitting later)
  content = content.replace(/\r\n/g, '\n'); // Normalize Windows line breaks to Unix
  content = content.replace(/\r/g, '\n');   // Normalize Mac Classic line breaks to Unix

  // 2. Reduce multiple blank lines to a single blank line (helps with consistent paragraph separation)
  content = content.replace(/\n[\s\t]*\n/g, '\n\n'); // Handles blank lines with spaces/tabs
  content = content.replace(/\n{3,}/g, '\n\n'); // Reduce 3+ newlines to 2

  // 3. Trim leading/trailing whitespace from the overall content block
  content = content.trim(); 

  // 4. OPTIONAL: Remove excessive consecutive spaces within lines (if not handled by paragraph logic later)
  // content = content.replace(/[ \t]{2,}/g, ' '); 

  // 5. Further cleaning specific to Gutenberg or common text issues:
  //    - You might want to remove page numbers if they are consistently formatted.
  //    - Remove lines that are all caps and very short (often chapter titles or section headers you might not want in chunks).
  //    - Handle footnotes or other specific textual elements.
  //    This is where your "a lot of work" custom RegExes or logic would go.
  //    Example: content = content.replace(/\n\s*PAGE \d+\s*\n/gi, '\n'); // very basic page number removal

  return content; // Return the cleaned content. It should not be trimmed again here if chunking relies on \n\n
}


// --- Basic Text Chunking (Illustrative - replace with your more advanced logic if available) ---
// Simple chunking by paragraph, then by word count if paragraphs are too long.
// A more sophisticated approach would use semantic chunking or fixed token counts.
const MIN_CHUNK_CHAR_COUNT = 3000; // New: Minimum characters for a chunk
const TARGET_CHUNK_CHAR_COUNT = 6000; // New: Target characters for a chunk (approx. 2-3 pages)

function chunkBookText(text: string): string[] {
  if (!text) return [];
  console.log('[chunkBookText] Initial text length:', text.length);

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  console.log(`[chunkBookText] Number of paragraphs found after split: ${paragraphs.length}`);

  let currentChunkBuffer: string[] = [];
  let currentChunkCharCount = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];

    // Case 1: Current paragraph itself is very large
    if (paragraph.length > TARGET_CHUNK_CHAR_COUNT) {
      // First, if there's anything in the buffer, decide if it forms a valid chunk
      if (currentChunkBuffer.length > 0) {
        const bufferedContent = currentChunkBuffer.join('\n\n');
        if (bufferedContent.length >= MIN_CHUNK_CHAR_COUNT || chunks.length === 0) { // Allow smaller first chunk if necessary
          chunks.push(bufferedContent);
        } else if (chunks.length > 0) {
          // Try to append to the previous chunk if it's too small
          chunks[chunks.length - 1] += '\n\n' + bufferedContent;
        }
        currentChunkBuffer = [];
        currentChunkCharCount = 0;
      }

      // Split the large paragraph by word count (similar to old logic but for this specific case)
      const words = paragraph.split(/\s+/);
      let subChunk = '';
      for (const word of words) {
        if ((subChunk + ' ' + word).length > TARGET_CHUNK_CHAR_COUNT && subChunk.length > 0) {
          chunks.push(subChunk);
          subChunk = word;
        } else {
          subChunk = subChunk ? `${subChunk} ${word}` : word;
        }
      }
      if (subChunk.length > 0) {
        // If this last sub-chunk is too small, try to append it to the previous chunk if that chunk was also from this large paragraph
        if (chunks.length > 0 && subChunk.length < MIN_CHUNK_CHAR_COUNT && chunks[chunks.length -1].startsWith(words[0].substring(0,10))) { // Heuristic: previous chunk is from same para
            chunks[chunks.length -1] += ' ' + subChunk;
        } else {
            chunks.push(subChunk);
        }
      }
      continue; // Move to the next paragraph
    }

    // Case 2: Adding current paragraph to buffer would exceed target
    if (currentChunkCharCount + paragraph.length + (currentChunkBuffer.length > 0 ? 2 : 0) > TARGET_CHUNK_CHAR_COUNT) {
      if (currentChunkBuffer.length > 0 && currentChunkCharCount >= MIN_CHUNK_CHAR_COUNT) {
        chunks.push(currentChunkBuffer.join('\n\n'));
        currentChunkBuffer = [paragraph];
        currentChunkCharCount = paragraph.length;
      } else if (currentChunkBuffer.length > 0) { // Buffer is too small to be its own chunk yet
        currentChunkBuffer.push(paragraph);
        currentChunkCharCount += paragraph.length + 2; // +2 for '\n\n'
        // (This combined chunk might now be over TARGET, but will be pushed in the next iteration or at the end)
      } else { // Buffer is empty, current paragraph is less than TARGET but starts a new potential chunk
        currentChunkBuffer = [paragraph];
        currentChunkCharCount = paragraph.length;
      }
    } else {
      // Case 3: Add current paragraph to buffer
      currentChunkBuffer.push(paragraph);
      currentChunkCharCount += paragraph.length + (currentChunkBuffer.length > 1 ? 2 : 0); // +2 for '\n\n' if not the first para in buffer
    }
  }

  // Add any remaining content in the buffer as the last chunk
  if (currentChunkBuffer.length > 0) {
    const remainingContent = currentChunkBuffer.join('\n\n');
    if (chunks.length > 0 && remainingContent.length < MIN_CHUNK_CHAR_COUNT) {
        // If the last buffered content is too small, append it to the previous chunk
        chunks[chunks.length - 1] += '\n\n' + remainingContent;
    } else {
        chunks.push(remainingContent);
    }
  }

  console.log(`[chunkBookText] Total chunks created: ${chunks.length}`);
  if (chunks.length > 0) {
    console.log(`[chunkBookText] Example chunk 0 length: ${chunks[0].length}`);
    if (chunks.length > 1) {
      console.log(`[chunkBookText] Example chunk 1 length: ${chunks[1] ? chunks[1].length : 'N/A'}`);
    }
  }
  return chunks.filter(chunk => chunk.length > 0);
}


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gutenberg_id: string }> }
) {
  const { gutenberg_id } = await params;
  const supabase = createSupabaseAdminClient();

  if (!gutenberg_id || isNaN(Number(gutenberg_id))) {
    return NextResponse.json({ error: 'Invalid Gutenberg ID.' }, { status: 400 });
  }
  const numericGutenbergId = Number(gutenberg_id);

  try {
    // 1. Check if book already ingested and fully processed in public_books
    const { data: existingPublicBook, error: fetchError } = await supabase
      .from('public_books')
      .select('id, raw_text_url, ingested_at, formats') // Added formats
      .eq('gutenberg_id', numericGutenbergId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing public book:', fetchError);
      return NextResponse.json({ error: 'Database error checking for book.', details: fetchError.message }, { status: 500 });
    }

    // If book exists and was already ingested (has chunks), return success or conflict
    if (existingPublicBook && existingPublicBook.ingested_at) {
      const { count: chunkCount, error: chunkCountError } = await supabase
        .from('book_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('public_book_id', existingPublicBook.id);

      if (chunkCountError) {
         console.warn('Error counting chunks for already ingested book:', chunkCountError.message);
      }
      
      if (chunkCount && chunkCount > 0) {
        return NextResponse.json(
          { message: 'Book already ingested and processed.', book_id: existingPublicBook.id, gutenberg_id: numericGutenbergId },
          { status: 200 } // Or 409 Conflict if preferred for "already exists"
        );
      }
      // If ingested_at is set but no chunks, something went wrong, proceed to re-process text
      console.warn(`Book ${numericGutenbergId} marked ingested but no chunks found. Re-processing text.`);
    }
    
    let publicBookDbId: number;
    let rawTextUrl: string | null = existingPublicBook?.raw_text_url || null;
    const bookFormats: Record<string, string | undefined> | null = existingPublicBook?.formats || null; // More specific type for formats
    // let bookDownloadCount: number | null = null; // Removed as it was not used


    // 2. If not in public_books or missing essential data, fetch metadata from Gutendex
    if (!existingPublicBook || !rawTextUrl || !bookFormats) {
      const gutendexResponse = await fetch(`https://gutendex.com/books/${numericGutenbergId}`);
      if (!gutendexResponse.ok) {
        if (gutendexResponse.status === 404) {
            return NextResponse.json({ error: `Book with Gutenberg ID ${numericGutenbergId} not found on Gutendex.` }, { status: 404 });
        }
        console.error('Gutendex API error:', gutendexResponse.status, await gutendexResponse.text());
        return NextResponse.json({ error: 'Failed to fetch book metadata from Gutendex.' }, { status: 502 });
      }
      const bookData = await gutendexResponse.json();

      rawTextUrl = 
        bookData.formats['text/plain; charset=utf-8'] ||
        bookData.formats['text/plain; charset=us-ascii'] ||
        bookData.formats['text/plain'] ||
        Object.values(bookData.formats).find(url => typeof url === 'string' && url.endsWith('.txt')) as string | undefined ||
        null;

      if (!rawTextUrl) {
        return NextResponse.json({ error: 'No suitable plain text URL found for this book on Gutendex.' }, { status: 404 });
      }

      // 3. Upsert into public_books (insert or update if it existed but was missing URL)
      const { data: upsertedPublicBook, error: upsertError } = await supabase
        .from('public_books')
        .upsert(
          {
            gutenberg_id: numericGutenbergId,
            title: bookData.title,
            authors: bookData.authors,
            subjects: bookData.subjects || [],
            bookshelves: bookData.bookshelves || [],
            languages: bookData.languages || [],
            copyright_info: String(bookData.copyright),
            media_type: bookData.media_type,
            formats: bookData.formats,
            download_count: bookData.download_count,
            raw_text_url: rawTextUrl,
            last_modified_at: new Date().toISOString(),
          },
          { 
            onConflict: 'gutenberg_id',
          }
        )
        .select('id, raw_text_url') // Ensure we get the ID and raw_text_url back
        .single();

      if (upsertError || !upsertedPublicBook) {
        console.error('Error upserting public book:', upsertError);
        return NextResponse.json({ error: 'Database error saving book metadata.', details: upsertError?.message }, { status: 500 });
      }
      publicBookDbId = upsertedPublicBook.id;
      // rawTextUrl might have been updated if it was missing
      rawTextUrl = upsertedPublicBook.raw_text_url || rawTextUrl; 
    } else {
      publicBookDbId = existingPublicBook.id;
      // rawTextUrl is already set from existingPublicBook
    }
    
    if (!rawTextUrl) { // Should be caught earlier, but double check
        return NextResponse.json({ error: 'Raw text URL for the book is missing.' }, { status: 500 });
    }

    // 4. Fetch raw text content
    console.log(`Fetching raw text from: ${rawTextUrl}`);
    const textResponse = await fetch(rawTextUrl);
    if (!textResponse.ok) {
      console.error('Failed to fetch raw text:', textResponse.status, await textResponse.text());
      return NextResponse.json({ error: 'Failed to fetch book text content.' }, { status: 502 });
    }
    const rawText = await textResponse.text();

    // 5. Clean text
    const cleanedText = cleanBookTextRevised(rawText); // USE THE REVISED FUNCTION
    const cleanedTextLength = cleanedText.length;
    console.log(`Raw text length: ${rawText.length}, Cleaned text length: ${cleanedTextLength}`);


    // 6. Chunk text
    const textChunks = chunkBookText(cleanedText);
    console.log(`Text chunked into ${textChunks.length} chunks.`);

    if (textChunks.length === 0 && cleanedTextLength > 0) {
        console.warn("Cleaned text was not empty, but no chunks were produced. Check chunking logic.");
        // Potentially save the cleaned text as a single chunk if it's short enough or handle as error
    }
    
    // 7. Save chunks to book_chunks (delete existing chunks first for idempotency)
    const { error: deleteChunksError } = await supabase
      .from('book_chunks')
      .delete()
      .eq('public_book_id', publicBookDbId);

    if (deleteChunksError) {
      console.error('Error deleting existing chunks:', deleteChunksError);
      // Decide if this is a fatal error or if we can proceed
    }

    // Removed Tiktoken related error handling and instance retrieval

    if (textChunks.length > 0) {
      const chunkObjects = textChunks.map((content, index) => ({
        public_book_id: publicBookDbId,
        chunk_index: index,
        content: content,
        char_count: content.length,
        token_count: null, // Set token_count to null
      }));

      const { error: insertChunksError } = await supabase
        .from('book_chunks')
        .insert(chunkObjects);

      if (insertChunksError) {
        console.error('Error inserting book chunks:', insertChunksError);
        return NextResponse.json({ error: 'Database error saving book chunks.', details: insertChunksError.message }, { status: 500 });
      }
    } else {
        console.log(`No chunks to insert for book ${publicBookDbId}.`);
    }


    // 8. Update public_books with ingested_at and cleaned_text_length
    const { error: updatePublicBookError } = await supabase
      .from('public_books')
      .update({
        ingested_at: new Date().toISOString(),
        cleaned_text_length: cleanedTextLength,
        last_modified_at: new Date().toISOString(),
      })
      .eq('id', publicBookDbId);

    if (updatePublicBookError) {
      console.error('Error updating public_book after ingestion:', updatePublicBookError);
      // This is not ideal, as chunks are saved but the book isn't marked fully ingested.
      // Consider how to handle this inconsistency.
    }

    return NextResponse.json(
      { 
        message: 'Book ingested successfully.', 
        book_id: publicBookDbId, 
        gutenberg_id: numericGutenbergId,
        chunks_created: textChunks.length 
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('Full ingestion API error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'An unexpected error occurred during ingestion.', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred during ingestion.' }, { status: 500 });
  }
} 