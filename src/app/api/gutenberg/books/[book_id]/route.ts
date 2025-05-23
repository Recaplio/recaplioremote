import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '../../../../../utils/supabase/server'; // Corrected path

// TODO: Move these to environment variables
// const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_url';
// const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_supabase_service_role_key';

// Initialize Supabase client
// For server-side operations, it's better to use a service role key if available and properly configured.
// If you have a specific server client utility (e.g., from @supabase/ssr for Next.js), use that.
// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface GetParams {
  params: {
    book_id: string;
  };
}

// Interface for author object from Gutendex
interface GutendexAuthor {
  name: string;
  birth_year: number | null;
  death_year: number | null;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\\\\]\\\\]/g, '\\\\$&');
}

function cleanTextV7(rawText: string, title: string): string {
  let text = rawText;
  const titleEscaped = escapeRegExp(title);
  const processingLog = []; // Changed to const

  processingLog.push(`Original length: ${text.length}`);

  // Stage 1: Attempt to find the Project Gutenberg START marker
  const pgHeaderRegexPattern = `\\*\\*\\*\\s*START OF (?:THIS|THE) PROJECT GUTENBERG EBOOK ${titleEscaped}\\s*\\*\\*\\*`;
  const pgHeaderRegex = new RegExp(pgHeaderRegexPattern, 'i');
  const headerMatch = pgHeaderRegex.exec(text);

  if (headerMatch) {
    processingLog.push(`PG Start Marker found at index ${headerMatch.index}. Text before this: ${headerMatch[0].substring(0,100)}`);
    text = text.substring(headerMatch.index + headerMatch[0].length);
    processingLog.push(`Length after PG Start Marker removal: ${text.length}`);
  } else {
    processingLog.push('PG Start Marker not found. Using text from beginning.');
    // Fallback: try a more generic start marker if the title-specific one isn't found
    // This is kept minimal to be safe
    const genericHeaderRegex = new RegExp(`\\*\\*\\*\\s*START OF (?:THIS|THE) PROJECT GUTENBERG EBOOK.*?\\s*\\*\\*\\*`, 'i');
    const genericHeaderMatch = genericHeaderRegex.exec(rawText); // Search in original rawText
    if (genericHeaderMatch && genericHeaderMatch.index < rawText.length * 0.1) { // Only if very near the start
        processingLog.push(`Generic PG Start Marker found at index ${genericHeaderMatch.index}.`);
        text = rawText.substring(genericHeaderMatch.index + genericHeaderMatch[0].length);
        processingLog.push(`Length after Generic PG Start Marker removal: ${text.length}`);
    } else {
        processingLog.push('Generic PG Start Marker also not found or not near start. Proceeding with full original text for now.');
        text = rawText; // Crucially, ensure we fall back to rawText if no header is reliably found
    }
  }

  // Stage 2: Attempt to find the Project Gutenberg END marker in the (potentially header-stripped) text
  const pgFooterRegexPattern = `\\*\\*\\*\\s*END OF (?:THIS|THE) PROJECT GUTENBERG EBOOK ${titleEscaped}\\s*\\*\\*\\*`;
  const pgFooterRegex = new RegExp(pgFooterRegexPattern, 'i');
  const footerMatch = pgFooterRegex.exec(text);

  if (footerMatch) {
    processingLog.push(`PG End Marker found at index ${footerMatch.index} (relative to current text). Text from this marker: ${text.substring(footerMatch.index, footerMatch.index+100)}`);
    text = text.substring(0, footerMatch.index);
    processingLog.push(`Length after PG End Marker removal: ${text.length}`);
  } else {
    processingLog.push('PG End Marker not found. Looking for generic license blocks at the end.');
    // Fallback: If no specific PG END marker, try to trim common PG license text from the very end.
    // This regex is designed to match typical license blocks only if they are substantial and at the end.
    const licenseBlockRegex = new RegExp(
      `(\\s*<<(?:\\s*THE END|End of Project Gutenberg|End of the Project Gutenberg)[^<>]*>>\\s*$|` + // Gutenberg official bracketed end note
      `End of the Project Gutenberg EBook of ${titleEscaped}[^\\n]*\n|` + // End of ebook line
      `START OF THE PROJECT GUTENBERG LICENSE.*?END OF THE PROJECT GUTENBERG LICENSE.*|` + // Full license block
      `End of Project Gutenberg's ${titleEscaped}|` + // Another variant
      `Small Print \\*\\*\\*.*)`,
      'is' // case insensitive, dot matches newline, ensure it can span multiple lines
    );
    
    // Search for the license block in the current state of 'text'
    const licenseMatch = licenseBlockRegex.exec(text);
    // Ensure the match is substantial and very close to the end to avoid accidental truncation of content
    if (licenseMatch && (text.length - (licenseMatch.index + licenseMatch[0].length) < 100 || licenseMatch.index > text.length * 0.90) ) {
        processingLog.push(`Generic PG License/End block found at index ${licenseMatch.index}. Removing it.`);
        text = text.substring(0, licenseMatch.index);
        processingLog.push(`Length after generic license block removal: ${text.length}`);
    } else {
        processingLog.push('No generic PG License/End block found or not conclusively at the end. Text will end here.');
    }
  }

  // Stage 3: Minimal final whitespace cleanup
  text = text.replace(/\r\n/g, '\n'); // Normalize newlines
  text = text.replace(/\n{3,}/g, '\n\n'); // Replace 3+ newlines with 2
  text = text.trim(); // Trim leading/trailing whitespace overall
  
  processingLog.push(`Final length: ${text.length}`);
  // console.log("CleanTextV7 Processing Log:", processingLog.join('\n'));

  return text;
}

function chunkText(text: string, maxChunkSizeChars: number = 2000, minChunkSizeChars: number = 500): string[] {
  if (!text) return [];

  const paragraphs = text.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];

    if (currentChunk.length + paragraph.length + (currentChunk.length > 0 ? 2 : 0) <= maxChunkSizeChars) {
      // If current chunk is not empty, add a paragraph separator
      if (currentChunk.length > 0) {
        currentChunk += "\n\n";
      }
      currentChunk += paragraph;
    } else {
      // Current paragraph would make the chunk too large
      if (currentChunk.length > 0) {
        // First, push the existing chunk if it meets minimum size or is all we have
        if (currentChunk.length >= minChunkSizeChars || chunks.length === 0) {
            chunks.push(currentChunk);
        }
        currentChunk = ""; // Reset for the new chunk
      }

      // Handle the paragraph that was too large to add
      if (paragraph.length <= maxChunkSizeChars) {
        // If the paragraph itself is not too large, it becomes a new chunk
        currentChunk = paragraph;
      } else {
        // If the paragraph itself is too large, split it by sentences (simple split)
        // This is a basic sentence split, can be improved.
        const sentences = paragraph.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
        let sentenceAccumulator = "";
        for (const sentence of sentences) {
          if (sentenceAccumulator.length + sentence.length + (sentenceAccumulator.length > 0 ? 1 : 0) <= maxChunkSizeChars) {
            if (sentenceAccumulator.length > 0) sentenceAccumulator += " ";
            sentenceAccumulator += sentence;
          } else {
            if (sentenceAccumulator.length > 0) chunks.push(sentenceAccumulator);
            sentenceAccumulator = sentence; // Start new accumulator with current sentence
          }
        }
        // Add any remaining sentences in the accumulator
        if (sentenceAccumulator.length > 0) {
            // If currentChunk is empty and sentenceAccumulator is small, try to append to last chunk if possible
            if (currentChunk.length === 0 && sentenceAccumulator.length < minChunkSizeChars && chunks.length > 0 && 
                (chunks[chunks.length-1].length + sentenceAccumulator.length + 2) <= maxChunkSizeChars) {
                chunks[chunks.length-1] += "\n\n" + sentenceAccumulator;
            } else {
                chunks.push(sentenceAccumulator);
            }
        }
        currentChunk = ""; // Paragraph processed by sentence splitting
        continue; // Skip the normal chunk finalization for this iteration
      }
    }

    // After processing a paragraph, check if currentChunk should be pushed
    if (currentChunk.length >= maxChunkSizeChars || (i === paragraphs.length - 1 && currentChunk.length > 0)) {
        if (currentChunk.length >= minChunkSizeChars || chunks.length === 0 && currentChunk.length > 0) {
            chunks.push(currentChunk);
        }
        currentChunk = "";
    }
  }
  
  // Final check for any remaining content in currentChunk
  if (currentChunk.length > 0) {
    if (currentChunk.length >= minChunkSizeChars || chunks.length === 0) {
        chunks.push(currentChunk);
    } else if (chunks.length > 0) {
        // Try to append to the last chunk if it doesn't make it too large
        if ((chunks[chunks.length-1].length + currentChunk.length + 2) <= maxChunkSizeChars) {
            chunks[chunks.length-1] += "\n\n" + currentChunk;
        } else {
            chunks.push(currentChunk); // Push as a small chunk if can't append
        }
    }
  }

  return chunks.filter(c => c.length > 0); // Ensure no empty chunks are returned
}

export async function GET(request: NextRequest, { params }: GetParams) {
  const { book_id } = params;
  const action = request.nextUrl.searchParams.get('action');

  if (!book_id) {
    return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
  }

  try {
    const metadataResponse = await fetch(`https://gutendex.com/books/${book_id}`);

    if (!metadataResponse.ok) {
      if (metadataResponse.status === 404) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }
      console.error('Gutendex API error during metadata fetch:', metadataResponse.status, await metadataResponse.text());
      return NextResponse.json(
        { error: `Failed to fetch metadata from Gutendex: ${metadataResponse.status}` },
        { status: metadataResponse.status }
      );
    }

    const bookData = await metadataResponse.json();

    const transformedBook = {
      id: bookData.id,
      title: bookData.title,
      authors: bookData.authors.map((a: GutendexAuthor) => ({
        name: a.name, 
        birth_year: a.birth_year, 
        death_year: a.death_year 
      })),
      subjects: bookData.subjects,
      bookshelves: bookData.bookshelves,
      languages: bookData.languages,
      copyright: bookData.copyright,
      media_type: bookData.media_type,
      formats: bookData.formats,
      download_count: bookData.download_count,
    };

    if (action === 'ingest') {
      let plainTextUrl = transformedBook.formats['text/plain; charset=utf-8'];
      if (!plainTextUrl) {
        plainTextUrl = transformedBook.formats['text/plain; charset=us-ascii'];
      }
       if (!plainTextUrl) {
        // More robust search for any .txt file, preferring those with charset info
        const txtFormats = Object.keys(transformedBook.formats).filter(f => f.startsWith('text/plain'));
        if (txtFormats.length > 0) {
            plainTextUrl = transformedBook.formats[txtFormats.find(f => f.includes('utf-8')) || 
                                             txtFormats.find(f => f.includes('us-ascii')) || 
                                             txtFormats.find(f => transformedBook.formats[f].endsWith('.txt')) ||
                                             txtFormats[0]];
        }
      }

      if (!plainTextUrl) {
        return NextResponse.json({ error: 'Plain text URL not found for this book (v7 check)..', bookData: transformedBook }, { status: 404 });
      }

      try {
        const textResponse = await fetch(plainTextUrl);
        if (!textResponse.ok) {
          console.error('Failed to download text content:', textResponse.status, await textResponse.text());
          return NextResponse.json(
            { error: `Failed to download text content: ${textResponse.status}`, plainTextUrl },
            { status: textResponse.status }
          );
        }
        const rawText = await textResponse.text();
        
        const cleanedText = cleanTextV7(rawText, transformedBook.title);
        const chunks = chunkText(cleanedText);
        
        // Database operations
        const supabase = createSupabaseAdminClient(); // Use the admin client
        let dbBookId: number | null = null;
        let chunksStoredCount = 0;

        try {
          // 1. Upsert book metadata into public_books
          const { data: bookUpsertData, error: bookUpsertError } = await supabase
            .from('public_books')
            .upsert({
              gutenberg_id: transformedBook.id,
              title: transformedBook.title,
              authors: transformedBook.authors,
              subjects: transformedBook.subjects,
              bookshelves: transformedBook.bookshelves,
              languages: transformedBook.languages,
              copyright_info: String(transformedBook.copyright), // Ensure it's a string
              media_type: transformedBook.media_type,
              formats: transformedBook.formats,
              download_count: transformedBook.download_count,
              raw_text_url: plainTextUrl, // Store the URL from which text was ingested
              cleaned_text_length: cleanedText.length,
              last_modified_at: new Date().toISOString(),
            })
            .select('id') // Select the id of the upserted record
            .single(); // We expect a single record

          if (bookUpsertError) {
            console.error('Supabase error upserting book:', bookUpsertError);
            throw bookUpsertError; // Propagate error to catch block
          }
          
          if (!bookUpsertData || !bookUpsertData.id) {
            console.error('Supabase upsert did not return an ID for the book.');
            throw new Error('Failed to get book ID after upsert.');
          }
          dbBookId = bookUpsertData.id;

          // 2. Clear old chunks for this book (if any)
          const { error: deleteChunksError } = await supabase
            .from('book_chunks')
            .delete()
            .eq('public_book_id', dbBookId);

          if (deleteChunksError) {
            console.error('Supabase error deleting old chunks:', deleteChunksError);
            throw deleteChunksError;
          }

          // 3. Insert new chunks
          if (chunks.length > 0 && dbBookId) {
            const chunkRecords = chunks.map((chunkContent, index) => ({
              public_book_id: dbBookId,
              chunk_index: index,
              content: chunkContent,
              char_count: chunkContent.length,
              // token_count will be added later
            }));

            const { error: insertChunksError } = await supabase
              .from('book_chunks')
              .insert(chunkRecords);

            if (insertChunksError) {
              console.error('Supabase error inserting chunks:', insertChunksError);
              throw insertChunksError;
            }
            chunksStoredCount = chunkRecords.length;
          }

          return NextResponse.json({ 
            message: `Book ingested and stored. ID: ${dbBookId}. ${chunksStoredCount} chunks saved. (v9 - DB Integration)`,
            bookId: transformedBook.id, 
            dbBookId: dbBookId,
            title: transformedBook.title, 
            originalLength: rawText.length,
            cleanedLength: cleanedText.length,
            chunkCount: chunks.length,
            chunksStored: chunksStoredCount,
            // chunksSample: chunks.slice(0, 1) // Optionally reduce sample or remove for production
          });

        } catch (dbError: unknown) {
          console.error('Database operation failed:', dbError);
          return NextResponse.json(
            { 
              error: 'Failed to store book and/or chunks in database.',
              details: (dbError instanceof Error) ? dbError.message : String(dbError),
              bookId: transformedBook.id,
              title: transformedBook.title,
            },
            { status: 500 }
          );
        }

      } catch (textError: unknown) {
        console.error(`Error fetching book text from ${plainTextUrl}:`, textError);
        return NextResponse.json(
          { error: `Internal server error while fetching book text from ${plainTextUrl}`, details: (textError instanceof Error) ? textError.message : String(textError) },
          { status: 500 }
        );
      }

    } else {
      return NextResponse.json(transformedBook);
    }

  } catch (error: unknown) {
    console.error(`Error processing book ${book_id}:`, error);
    return NextResponse.json(
      { error: `Internal server error while processing book ${book_id}`, details: (error instanceof Error) ? error.message : String(error) },
      { status: 500 }
    );
  }
} 