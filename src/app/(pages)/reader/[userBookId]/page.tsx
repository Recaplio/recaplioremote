'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PencilIcon as HighlightIcon,
  BookmarkIcon, 
  ChatBubbleLeftEllipsisIcon as AnnotateIcon
} from '@heroicons/react/24/outline';
import ChunkSelector from "@/components/reader/ChunkSelector";
import AIAssistant from "@/components/reader/AIAssistant";
import SemanticSearch from "@/components/reader/SemanticSearch";
import { useAuth } from '@/app/components/auth/AuthProvider';
import { type ReadingMode, type KnowledgeLens } from '@/lib/ai/rag';

interface AuthorData {
  name: string;
  birth_year?: number;
  death_year?: number;
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
  current_chunk_index: number | null;
  public_books: PublicBookShape;
}

interface BookChunk {
  chunk_index: number;
  content: string;
}

const getCurrentChunkContent = (chunks: BookChunk[], currentChunkIndex: number): string => {
  if (!chunks || chunks.length === 0) return "No content available for this chapter.";
  const index = Math.max(0, Math.min(currentChunkIndex, chunks.length - 1));
  const chunk = chunks[index];
  return chunk?.content || "Error loading chunk content.";
};

export default function ReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session, supabase } = useAuth();
  
  const [userBookData, setUserBookData] = useState<UserBookDataFromDB | null>(null);
  const [bookChunks, setBookChunks] = useState<BookChunk[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readingMode, setReadingMode] = useState<ReadingMode>('fiction');
  const [knowledgeLens, setKnowledgeLens] = useState<KnowledgeLens>('literary');

  const userBookId = params?.userBookId as string;
  const chunkParam = searchParams?.get('chunk');

  useEffect(() => {
    if (!session?.user || !userBookId) {
      router.push('/login?message=Please log in to read books.');
      return;
    }

    fetchBookData();
  }, [session, userBookId, supabase]);

  const fetchBookData = async () => {
    if (!session?.user || !supabase) return;

    try {
      setLoading(true);
      const userBookIdNum = parseInt(userBookId, 10);

      if (isNaN(userBookIdNum)) {
        setError('Invalid book ID');
        return;
      }

      // Fetch user book data
      const { data: userBook, error: userBookError } = await supabase
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
        .eq("user_id", session.user.id)
        .single<UserBookDataFromDB>();

      if (userBookError || !userBook) {
        setError('Book not found or access denied');
        return;
      }

      setUserBookData(userBook);

      // Fetch book chunks
      const { data: chunks, error: chunksError } = await supabase
        .from("book_chunks")
        .select("chunk_index, content")
        .eq("public_book_id", userBook.public_books.id)
        .order("chunk_index", { ascending: true })
        .returns<BookChunk[]>();

      if (chunksError) {
        setError('Error loading book content');
        return;
      }

      setBookChunks(chunks || []);
    } catch (err) {
      console.error('Error fetching book data:', err);
      setError('An error occurred while loading the book');
    } finally {
      setLoading(false);
    }
  };

  const updateReadingProgress = async (newChunkIndex: number) => {
    if (!userBookData || !bookChunks) return;

    try {
      const progressPercent = Math.round(((newChunkIndex + 1) / bookChunks.length) * 100);
      
      await supabase
        .from("user_books")
        .update({
          current_chunk_index: newChunkIndex,
          reading_progress_percent: progressPercent,
        })
        .eq("id", userBookData.id)
        .eq("user_id", session?.user?.id);
    } catch (err) {
      console.error('Error updating reading progress:', err);
    }
  };

  const handleChunkNavigation = (chunkIndex: number) => {
    router.push(`/reader/${userBookId}?chunk=${chunkIndex}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !userBookData || !bookChunks) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Book</h1>
        <p className="text-gray-700 mb-2">{error || 'Book data could not be loaded'}</p>
        <Link href="/library" className="text-indigo-600 hover:underline">Return to Library</Link>
      </div>
    );
  }

  // Determine current chunk index
  let resolvedChunkIndex = 0;
  if (chunkParam) {
    const parsedChunk = parseInt(chunkParam, 10);
    if (!isNaN(parsedChunk) && parsedChunk >= 0 && parsedChunk < bookChunks.length) {
      resolvedChunkIndex = parsedChunk;
      updateReadingProgress(resolvedChunkIndex);
    }
  } else if (userBookData.current_chunk_index !== null && userBookData.current_chunk_index < bookChunks.length) {
    resolvedChunkIndex = userBookData.current_chunk_index;
  }

  const currentChunkIndex = Math.max(0, Math.min(resolvedChunkIndex, bookChunks.length - 1));
  const publicBookDetails = userBookData.public_books;
  const bookTitle = publicBookDetails.title || "Book Title";
  const readingProgress = Math.round(((currentChunkIndex + 1) / bookChunks.length) * 100);
  const currentChapterTitle = `Chunk ${currentChunkIndex + 1} of ${bookChunks.length}`;
  const contentToShow = getCurrentChunkContent(bookChunks, currentChunkIndex);

  return (
    <div className="flex flex-col md:flex-row flex-grow bg-gray-50 overflow-hidden h-[calc(100vh-150px)]">
      {/* Left Pane (Reader) */}
      <div className="w-full md:w-2/3 border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Reader Header */}
        <div className="p-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-2">
            <h1 className="text-xl font-semibold text-gray-800 order-1 sm:order-none truncate mr-2">
              {bookTitle}
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
                href={currentChunkIndex > 0 ? `/reader/${userBookId}?chunk=${currentChunkIndex - 1}` : '#'}
                className={`text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors ${currentChunkIndex === 0 ? 'pointer-events-none opacity-50' : ''}`}
              >
                Prev
              </Link>
              
              <ChunkSelector
                basePath={`/reader/${userBookId}`}
                currentChunkIndex={currentChunkIndex}
                totalChunks={bookChunks.length}
                disabled={bookChunks.length === 0}
              />

              <Link 
                href={currentChunkIndex < bookChunks.length - 1 ? `/reader/${userBookId}?chunk=${currentChunkIndex + 1}` : '#'}
                className={`text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors ${currentChunkIndex >= bookChunks.length - 1 ? 'pointer-events-none opacity-50' : ''}`}
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
            <SemanticSearch 
              bookId={publicBookDetails.id}
              onChunkSelect={handleChunkNavigation}
            />
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
      <AIAssistant
        bookId={publicBookDetails.id}
        currentChunkIndex={currentChunkIndex}
        readingMode={readingMode}
        knowledgeLens={knowledgeLens}
        onReadingModeChange={setReadingMode}
        onKnowledgeLensChange={setKnowledgeLens}
      />
    </div>
  );
} 