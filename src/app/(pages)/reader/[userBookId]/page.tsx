import { createSupabaseServerClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { 
  PencilIcon as HighlightIcon, // Using Pencil for Highlight as an example
  BookmarkIcon, 
  ChatBubbleLeftEllipsisIcon as AnnotateIcon // Example for Annotate
} from '@heroicons/react/24/outline'; // Assuming you use Heroicons
import ChunkSelector from "@/components/reader/ChunkSelector"; // Import the new component
import { updateReadingProgress } from "@/app/actions/userBookActions"; // Import the server action

interface ReaderPageParams {
  userBookId: string;
}

interface ReaderPageProps {
  params: Promise<ReaderPageParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// More generic Author type for now to avoid issues with Supabase JSONB typing
interface AuthorData {
  name: string;
  birth_year?: number; // Made more specific
  death_year?: number; // Made more specific
}

interface PublicBookShape {
  id: number;
  title: string;
  authors: AuthorData[] | null;
  gutenberg_id: number | null;
}

interface UserBookDataFromDB {
    id: number;
    user_id: string;
    public_book_db_id: number;
    current_chunk_index: number | null; // Added to fetch
    // reading_progress_percent: number | null; // Not strictly needed to fetch, as it's derived
    public_books: PublicBookShape;
}

interface BookChunk {
  chunk_index: number;
  content: string;
}

// Helper to get current chunk based on an index or progress (simplified for now)
const getCurrentChunkContent = (chunks: BookChunk[], currentChunkIndex: number): string => {
  if (!chunks || chunks.length === 0) return "No content available for this chapter."; // More specific message
  const index = Math.max(0, Math.min(currentChunkIndex, chunks.length - 1));
  const chunk = chunks[index];
  return chunk?.content || "Error loading chunk content.";
};

export default async function ReaderPage({ params: rawParams, searchParams: rawSearchParams }: ReaderPageProps) {
  const params = await rawParams;
  const searchParams = await rawSearchParams;
  console.log(`[ReaderPage] Rendering for userBookId: ${params.userBookId}, searchParams:`, searchParams);
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('[ReaderPage] No user found, redirecting to login.');
    redirect("/login?message=Please log in to read books.");
  }
  console.log(`[ReaderPage] Authenticated user: ${user.id}`);

  const userBookIdNum = parseInt(params.userBookId, 10);
  console.log(`[ReaderPage] Parsed userBookIdNum: ${userBookIdNum}`);

  if (isNaN(userBookIdNum)) {
    console.log('[ReaderPage] userBookIdNum is NaN, returning notFound.');
    notFound();
  }

  const { data: userBookData, error: userBookError } = await supabase
    .from("user_books")
    .select(`
      id,
      user_id,
      public_book_db_id,
      current_chunk_index, 
      public_books!inner (
        id,
        title,
        authors,
        gutenberg_id
      )
    `)
    .eq("id", userBookIdNum)
    .eq("user_id", user.id)
    .single<UserBookDataFromDB>(); // Use the more specific type

  console.log('[ReaderPage] Fetched userBookData:', JSON.stringify(userBookData, null, 2));
  if (userBookError) {
    console.error('[ReaderPage] Supabase error fetching userBookData:', userBookError);
  }

  if (userBookError || !userBookData) {
    console.error(`[ReaderPage] Not found or error for user book ${userBookIdNum}. Error: ${userBookError?.message}`);
    notFound(); 
  }
  
  const publicBookDetails = userBookData.public_books;
  if (!publicBookDetails || !publicBookDetails.id) {
    console.error("[ReaderPage] Critical error: publicBookDetails is null after processing userBookData.public_books.");
    console.log("[ReaderPage] userBookData.public_books value:", JSON.stringify(userBookData.public_books, null, 2));
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Preparing Book Data</h1>
            <p className="text-gray-700 mb-2">Essential book information could not be prepared. Please try again later.</p>
            <Link href="/library" className="text-indigo-600 hover:underline">Return to Library</Link>
        </div>
    );
  }

  const { data: bookChunks, error: chunksError } = await supabase
    .from("book_chunks")
    .select("chunk_index, content")
    .eq("public_book_id", publicBookDetails.id) 
    .order("chunk_index", { ascending: true })
    .returns<BookChunk[]>();

  console.log(`[ReaderPage] Fetched bookChunks for public_book_id ${publicBookDetails.id}:`, JSON.stringify(bookChunks?.slice(0, 3), null, 2));
  if (chunksError) {
    console.error(`[ReaderPage] Error fetching chunks for public_book ${publicBookDetails.id}:`, chunksError);
  }

  if (!bookChunks || bookChunks.length === 0 && !chunksError) {
    console.log(`[ReaderPage] No chunks found for public_book_id ${publicBookDetails.id}. Displaying no content message.`);
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{publicBookDetails.title || 'Untitled Book'}</h1>
        <p className="text-sm text-gray-600 mb-6">
          By {publicBookDetails.authors?.map((a: AuthorData) => a.name).join(", ") || "Unknown Author"}
        </p>
        <div className="prose max-w-none bg-white p-6 shadow-md rounded-md">
            <p>No content found for this book. It might not have been processed correctly.</p>
        </div>
        <div className="mt-8 text-center">
            <Link href="/library" className="text-indigo-600 hover:underline">Return to Library</Link>
        </div>
      </div>
    );
  }
  
  // Determine initial/current chunk index
  let resolvedChunkIndex = 0;
  const chunkParam = searchParams?.chunk;

  if (chunkParam && !Array.isArray(chunkParam)) {
    const parsedChunk = parseInt(chunkParam, 10);
    if (!isNaN(parsedChunk) && bookChunks && parsedChunk >= 0 && parsedChunk < bookChunks.length) {
      resolvedChunkIndex = parsedChunk;
      // If chunkParam is present and valid, this is the user's explicit navigation.
      // Persist this progress.
      console.log(`[ReaderPage] Chunk param is present (${resolvedChunkIndex}), attempting to update progress.`);
      if (userBookData && typeof bookChunks?.length === 'number') { // Ensure necessary data is available
         // Call the server action - no need to await if we don't block rendering on its result
         updateReadingProgress(userBookData.id, resolvedChunkIndex, bookChunks.length)
           .then(result => console.log("[ReaderPage] updateReadingProgress from chunkParam change:", result))
           .catch(err => console.error("[ReaderPage] Error calling updateReadingProgress from chunkParam:", err));
      }
    } else {
      console.warn(`[ReaderPage] Invalid chunkParam '${chunkParam}', falling back to DB or 0.`);
      // Fallback if chunkParam is invalid
      resolvedChunkIndex = userBookData.current_chunk_index !== null && userBookData.current_chunk_index !== undefined && bookChunks && userBookData.current_chunk_index < bookChunks.length
        ? userBookData.current_chunk_index
        : 0;
    }
  } else if (userBookData.current_chunk_index !== null && userBookData.current_chunk_index !== undefined && bookChunks && userBookData.current_chunk_index < bookChunks.length) {
    // No chunkParam, use saved progress from DB if valid
    resolvedChunkIndex = userBookData.current_chunk_index;
    console.log(`[ReaderPage] No chunk param, using saved chunk index: ${resolvedChunkIndex}`);
  } else {
    // Default to 0 if no param and no valid saved progress
    resolvedChunkIndex = 0;
    console.log(`[ReaderPage] No chunk param or saved index, defaulting to 0.`);
  }

  // Final check for resolvedChunkIndex bounds, especially if bookChunks was initially null/empty
  if (bookChunks && bookChunks.length > 0) {
    resolvedChunkIndex = Math.max(0, Math.min(resolvedChunkIndex, bookChunks.length - 1));
  } else {
    resolvedChunkIndex = 0; // No chunks, so index must be 0
  }

  const currentChunkIndex = resolvedChunkIndex;
  const currentChapterTitle = bookChunks && bookChunks.length > 0 ? 
    `Chunk ${currentChunkIndex + 1} of ${bookChunks.length}` : 
    "Content Status Unknown";
  
  const contentToShow = chunksError 
    ? (chunksError as Error)?.message || "Error loading book content."
    : (!bookChunks || bookChunks.length === 0 ? "No content available for this book." : 
    getCurrentChunkContent(bookChunks, currentChunkIndex));
  
  console.log(`[ReaderPage] Current chunk index: ${currentChunkIndex}, Content: "${contentToShow.substring(0,50)}..."`);

  const bookTitle = publicBookDetails.title || "Book Title";
  const bookIdForDisplay = publicBookDetails.id;
  const readingProgress = bookChunks && bookChunks.length > 0 ? Math.round(((currentChunkIndex + 1) / bookChunks.length) * 100) : 0;

  // Placeholder data for UI elements from the screenshot
  // chapterOptions and selectedChapterValue removed as they were unused
  // const chapterOptions = [
  //   { value: "Chapter 1", label: "Chapter 1: The Beginning..." },
  //   { value: "Chapter 2", label: "Chapter 2: The Journey..." },
  //   { value: "Chapter 3", label: "Chapter 3: The Climax..." },
  // ];
  // const selectedChapterValue = "Chapter 2"; // Placeholder

  // AI Assistant placeholders
  const aiInteractions = [
    { sender: "AI", text: `Hello! How can I help you with "${bookTitle}" today while in Fiction mode?`, mode: "Fiction"},
    { sender: "You", text: "Summarize this chapter for me." },
    { sender: "AI", text: `Certainly! This chapter focuses on... (placeholder summary for Fiction mode).`, mode: "Fiction" }
  ];
  // Allow currentAIMode to be typed as either string for the placeholder logic
  const currentAIMode: string = "Fiction"; 
  const aiPlaceholderText = currentAIMode === "Fiction" ? "Ask about fiction aspects..." : "Ask about non-fiction anaylsis...";

  // Moved chunksError display to be just before the main return, so contentToShow can reflect it.
  if (chunksError) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Book Content</h1>
        <p className="text-gray-700 mb-2">Could not load the content for &quot;{publicBookDetails.title || 'this book'}&quot;.</p>
        <p className="text-sm text-gray-500">Details: {contentToShow}</p>
        <Link href="/library" className="text-indigo-600 hover:underline mt-4 inline-block">Return to Library</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row flex-grow bg-gray-50 overflow-hidden h-[calc(100vh-150px)]"> {/* Adjusted height */} 
      {/* Left Pane (Reader) */}
      <div className="w-full md:w-2/3 border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Reader Header */}
        <div className="p-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-2">
            <h1 className="text-xl font-semibold text-gray-800 order-1 sm:order-none truncate mr-2">
              {bookTitle} (UserBookID: {params.userBookId}, PB_ID: {bookIdForDisplay})
            </h1>
            <div className="flex items-center space-x-1 sm:space-x-2 order-2 sm:order-none flex-shrink-0">
              <button title="Highlight" className="p-1.5 sm:p-2 rounded-md hover:bg-yellow-100 text-gray-600 hover:text-yellow-600">
                <HighlightIcon className="w-5 h-5" />
              </button>
              <button title="Add Bookmark" className="p-1.5 sm:p-2 rounded-md hover:bg-blue-100 text-gray-600 hover:text-blue-600">
                <BookmarkIcon className="w-5 h-5" />
              </button>
              <button title="Annotate" className="p-1.5 sm:p-2 rounded-md hover:bg-green-100 text-gray-600 hover:text-green-600">
                <AnnotateIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-2">
            <div className="flex items-center space-x-2">
              <Link 
                href={currentChunkIndex > 0 ? `/reader/${params.userBookId}?chunk=${currentChunkIndex - 1}` : '#'}
                className={`text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors ${currentChunkIndex === 0 ? 'pointer-events-none opacity-50' : ''}`}
                aria-disabled={currentChunkIndex === 0}
                tabIndex={currentChunkIndex === 0 ? -1 : undefined}
              >
                Prev
              </Link>
              
              <ChunkSelector
                basePath={`/reader/${params.userBookId}`}
                currentChunkIndex={currentChunkIndex}
                totalChunks={bookChunks?.length || 0}
                disabled={!bookChunks || bookChunks.length === 0}
              />

              <Link 
                href={(bookChunks && currentChunkIndex < bookChunks.length - 1) ? `/reader/${params.userBookId}?chunk=${currentChunkIndex + 1}` : '#'}
                className={`text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors ${(bookChunks && currentChunkIndex >= bookChunks.length - 1) ? 'pointer-events-none opacity-50' : ''}`}
                aria-disabled={!bookChunks || currentChunkIndex >= bookChunks.length - 1}
                tabIndex={!bookChunks || currentChunkIndex >= bookChunks.length - 1 ? -1 : undefined}
              >
                Next
              </Link>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[180px]">
              <input type="range" min="0" max="100" readOnly className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={readingProgress} />
              <p className="text-xs text-gray-500 text-right mt-1">{readingProgress}%</p>
            </div>
          </div>
          <div className="mt-1">
            <input type="search" placeholder="Semantic search in book (e.g., themes, characters)..." className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
        </div>

        {/* Reader Content */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-white prose prose-sm sm:prose-base lg:prose-lg max-w-none">
          <h2 className="text-xl font-semibold mb-2">{currentChapterTitle}</h2>
          <div style={{ whiteSpace: "pre-wrap" }}>
            {contentToShow}
          </div>
        </div>
      </div>

      {/* Right Pane (AI Assistant) */}
      <div className="w-full md:w-1/3 p-3 sm:p-4 flex flex-col bg-white border-t md:border-t-0 md:border-l border-gray-200 md:h-full overflow-hidden">
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
          <div className="flex items-center space-x-1 border border-gray-300 rounded-full p-0.5 text-xs flex-shrink-0">
            <button className={`px-2.5 sm:px-3 py-1 rounded-full transition-all ${currentAIMode === 'Fiction' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}>Fiction</button>
            <button className={`px-2.5 sm:px-3 py-1 rounded-full transition-all ${currentAIMode === 'Non-Fiction' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}>Non-Fiction</button>
          </div>
        </div>
        <div className="flex-grow bg-gray-50 p-2 sm:p-3 rounded-md overflow-y-auto mb-3 text-sm space-y-3 min-h-[200px] md:min-h-0">
          {aiInteractions.map((interaction, index) => (
            <div key={index} className={`p-2 rounded-md max-w-[85%] ${interaction.sender === 'AI' ? 'bg-indigo-50 text-indigo-800 self-start' : 'bg-gray-200 text-gray-800 self-end ml-auto'}`}>
              <span className={`font-semibold block ${interaction.sender === 'You' ? 'text-right' : ''}`}>{interaction.sender}:</span> 
              {interaction.text}
            </div>
          ))}
        </div>
        <div className="mt-auto flex-shrink-0">
          <textarea className="w-full p-2 border border-gray-300 rounded-md mb-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none" rows={3} placeholder={typeof aiPlaceholderText !== 'undefined' ? aiPlaceholderText : "Ask AI..."}></textarea>
          <button className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">Send</button>
        </div>
      </div>
    </div>
  );
} 