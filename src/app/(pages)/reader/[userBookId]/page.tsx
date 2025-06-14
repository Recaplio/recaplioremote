'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PencilIcon as HighlightIcon,
  BookmarkIcon, 
  ChatBubbleLeftEllipsisIcon as AnnotateIcon
} from '@heroicons/react/24/outline';
import SectionSelector from "@/components/reader/SectionSelector";
import ReadingProgress from "@/components/reader/ReadingProgress";
import AIAssistant from "@/components/reader/AIAssistant";
import SemanticSearch from "@/components/reader/SemanticSearch";
import { useAuth } from '@/app/components/auth/AuthProvider';
import { type ReadingMode, type KnowledgeLens } from '@/lib/ai/client-utils';

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

interface APIChunkData {
  chunk_index: number;
  content: string;
  chapter_title?: string;
}

// Helper function to generate section previews and metadata
const generateSectionPreviews = (chunks: BookChunk[]) => {
  return chunks.map((chunk, index) => {
    const content = chunk.content || '';
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const estimatedReadingTime = Math.max(1, Math.round(wordCount / 200)); // 200 WPM average
    
    // Generate a preview (first 150 characters)
    const preview = content.length > 150 
      ? content.substring(0, 150).trim() + '...'
      : content;
    
    // Try to generate a smart title from the first sentence or paragraph
    const firstSentence = content.split(/[.!?]/)[0]?.trim();
    const title = firstSentence && firstSentence.length > 10 && firstSentence.length < 80
      ? firstSentence
      : `Section ${index + 1}`;
    
    return {
      index,
      title,
      preview,
      wordCount,
      estimatedReadingTime,
      isCompleted: false // This would be tracked in user progress
    };
  });
};

const getCurrentSectionContent = (chunks: BookChunk[], currentSectionIndex: number): string => {
  if (!chunks || chunks.length === 0) return "No content available for this section.";
  const index = Math.max(0, Math.min(currentSectionIndex, chunks.length - 1));
  const chunk = chunks[index];
  return chunk?.content || "Error loading section content.";
};

export default function ReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session, supabase, isLoading: authLoading } = useAuth();
  
  const [userBookData, setUserBookData] = useState<UserBookDataFromDB | null>(null);
  const [bookChunks, setBookChunks] = useState<BookChunk[] | null>(null);
  const [sectionPreviews, setSectionPreviews] = useState<Array<{
    index: number;
    title: string;
    preview: string;
    wordCount: number;
    estimatedReadingTime: number;
    isCompleted: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readingMode] = useState<ReadingMode>('fiction');
  const [knowledgeLens] = useState<KnowledgeLens>('literary');
  const [userTier, setUserTier] = useState<'FREE' | 'PREMIUM' | 'PRO'>('FREE');

  const userBookId = params?.userBookId as string;
  const chunkParam = searchParams?.get('chunk');

  const fetchBookData = useCallback(async () => {
    if (!session?.user || !supabase) return;

    try {
      setLoading(true);
      const userBookIdNum = parseInt(userBookId, 10);

      if (isNaN(userBookIdNum)) {
        setError('Invalid book ID');
        return;
      }

      console.log('[Reader] Fetching book via API for userBookId:', userBookId);
      
      // Use the API endpoint that bypasses RLS issues
      const response = await fetch(`/api/user-library/books/${userBookId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Book not found in your library');
        } else {
          setError(`Failed to fetch book: ${response.status}`);
        }
        return;
      }
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      console.log('[Reader] API returned book data:', data);

      // Convert API response to the expected format
      const userBookData: UserBookDataFromDB = {
        id: data.userBook.id,
        user_id: session.user.id,
        public_book_db_id: data.publicBook.id,
        current_chunk_index: data.userBook.currentChunkIndex,
        public_books: {
          id: data.publicBook.id,
          title: data.publicBook.title,
          authors: data.publicBook.authors,
          gutenberg_id: data.publicBook.gutenbergId
        }
      };

      setUserBookData(userBookData);

      // Convert chunks to expected format
      const bookSections: BookChunk[] = (data.chunks || []).map((chunk: APIChunkData) => ({
        chunk_index: chunk.chunk_index,
        content: chunk.content
      }));

      setBookChunks(bookSections);
      
      // Generate section previews
      const previews = generateSectionPreviews(bookSections);
      setSectionPreviews(previews);
      
    } catch (err) {
      console.error('Error fetching book data:', err);
      setError('An error occurred while loading the book');
    } finally {
      setLoading(false);
    }
  }, [session, supabase, userBookId]);

  const fetchUserTier = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/user/tier');
      if (response.ok) {
        const data = await response.json();
        setUserTier(data.tier || 'FREE');
        console.log('[Reader] User tier:', data.tier || 'FREE');
      } else {
        console.warn('[Reader] Failed to fetch user tier, defaulting to FREE');
        setUserTier('FREE');
      }
    } catch (error) {
      console.error('[Reader] Error fetching user tier:', error);
      setUserTier('FREE');
    }
  }, [session]);

  useEffect(() => {
    // Don't redirect immediately - wait for auth to load
    if (!authLoading && !session?.user) {
      router.push('/login?message=Please log in to read books.');
      return;
    }

    // Only fetch data when we have a session and userBookId
    if (session?.user && userBookId && !authLoading) {
      fetchBookData();
      fetchUserTier();
    }
  }, [session, userBookId, supabase, authLoading, fetchBookData, fetchUserTier, router]);

  const updateReadingProgress = async (newSectionIndex: number) => {
    if (!userBookData || !bookChunks) return;

    try {
      const progressPercent = Math.round(((newSectionIndex + 1) / bookChunks.length) * 100);
      
      await supabase
        .from("user_books")
        .update({
          current_chunk_index: newSectionIndex,
          reading_progress_percent: progressPercent,
        })
        .eq("id", userBookData.id)
        .eq("user_id", session?.user?.id);
    } catch (err) {
      console.error('Error updating reading progress:', err);
    }
  };

  const handleSectionNavigation = (sectionIndex: number) => {
    router.push(`/reader/${userBookId}?chunk=${sectionIndex}`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Authenticating...' : 'Loading book...'}
          </p>
        </div>
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

  // Determine current section index
  let resolvedSectionIndex = 0;
  if (chunkParam) {
    const parsedChunk = parseInt(chunkParam, 10);
    if (!isNaN(parsedChunk) && parsedChunk >= 0 && parsedChunk < bookChunks.length) {
      resolvedSectionIndex = parsedChunk;
      updateReadingProgress(resolvedSectionIndex);
    }
  } else if (userBookData.current_chunk_index !== null && userBookData.current_chunk_index < bookChunks.length) {
    resolvedSectionIndex = userBookData.current_chunk_index;
  }

  const currentSectionIndex = Math.max(0, Math.min(resolvedSectionIndex, bookChunks.length - 1));
  const publicBookDetails = userBookData.public_books;
  const bookTitle = publicBookDetails.title || "Book Title";
  const readingProgress = Math.round(((currentSectionIndex + 1) / bookChunks.length) * 100);
  const currentSectionTitle = sectionPreviews[currentSectionIndex]?.title || `Section ${currentSectionIndex + 1}`;
  const contentToShow = getCurrentSectionContent(bookChunks, currentSectionIndex);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
      {/* Enhanced Header with Book Info */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-3 md:px-4 py-3">
          {/* Title and Controls Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0 mr-3 md:mr-4">
              <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
                {bookTitle}
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                {publicBookDetails.authors?.[0]?.name || 'Unknown Author'}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
              <button 
                title="Highlight" 
                className="p-1.5 md:p-2 rounded-lg hover:bg-yellow-50 text-gray-600 hover:text-yellow-600 transition-colors"
              >
                <HighlightIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button 
                title="Add Bookmark" 
                className="p-1.5 md:p-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <BookmarkIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button 
                title="Annotate" 
                className="p-1.5 md:p-2 rounded-lg hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors"
              >
                <AnnotateIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            {/* Section Navigation */}
            <div className="flex items-center justify-center md:justify-start space-x-2 md:space-x-3">
              <Link 
                href={currentSectionIndex > 0 ? `/reader/${userBookId}?chunk=${currentSectionIndex - 1}` : '#'}
                className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                  currentSectionIndex === 0 ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Previous
              </Link>
              
              <SectionSelector
                basePath={`/reader/${userBookId}`}
                currentSectionIndex={currentSectionIndex}
                totalSections={bookChunks.length}
                sectionPreviews={sectionPreviews}
                disabled={bookChunks.length === 0}
              />

              <Link 
                href={currentSectionIndex < bookChunks.length - 1 ? `/reader/${userBookId}?chunk=${currentSectionIndex + 1}` : '#'}
                className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                  currentSectionIndex >= bookChunks.length - 1 ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Next
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-3">
            <SemanticSearch 
              bookId={publicBookDetails.id}
              onSectionSelect={handleSectionNavigation}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Reading Progress */}
      <ReadingProgress
        currentSectionIndex={currentSectionIndex}
        totalSections={bookChunks.length}
        readingProgress={readingProgress}
        sectionPreviews={sectionPreviews}
        onSectionSelect={handleSectionNavigation}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Reading Area */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {/* Section Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{currentSectionTitle}</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Section {currentSectionIndex + 1} of {bookChunks.length}</span>
                {sectionPreviews[currentSectionIndex]?.estimatedReadingTime && (
                  <>
                    <span>•</span>
                    <span>{sectionPreviews[currentSectionIndex].estimatedReadingTime} min read</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Reading Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="prose prose-lg max-w-none">
                <div 
                  style={{ 
                    whiteSpace: "pre-wrap", 
                    lineHeight: "1.8",
                    fontSize: "18px",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    color: "#374151"
                  }}
                  className="text-gray-800 leading-8"
                >
                  {contentToShow}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Assistant Panel */}
        <AIAssistantPanel
          bookId={publicBookDetails.id}
          currentChunkIndex={currentSectionIndex}
          userTier={userTier}
          readingMode={readingMode}
          knowledgeLens={knowledgeLens}
          userId={session?.user?.id || ''}
        />
      </div>
    </div>
  );
}

// New Collapsible AI Assistant Panel Component
function AIAssistantPanel({
  bookId,
  currentChunkIndex,
  userTier,
  readingMode,
  knowledgeLens,
  userId
}: {
  bookId: number;
  currentChunkIndex?: number;
  userTier: 'FREE' | 'PREMIUM' | 'PRO';
  readingMode: ReadingMode;
  knowledgeLens: KnowledgeLens;
  userId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Mobile overlay version
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return (
      <>
        {/* Mobile AI Toggle Button */}
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full shadow-xl flex items-center justify-center text-white hover:shadow-2xl hover:scale-105 transition-all duration-300 md:hidden"
          title="Open Lio"
        >
          <span className="text-2xl">🦁</span>
        </button>

        {/* Mobile AI Overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            
            {/* AI Panel */}
            <div className="absolute inset-x-3 top-3 bottom-3 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-xl">🦁</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Lio</h3>
                    <p className="text-sm text-gray-600">Your Literary Companion</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-3 rounded-full hover:bg-amber-100 transition-colors"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* AI Assistant Content */}
              <div className="flex-1 overflow-hidden">
                <AIAssistant
                  bookId={bookId}
                  currentChunkIndex={currentChunkIndex}
                  userTier={userTier}
                  readingMode={readingMode}
                  knowledgeLens={knowledgeLens}
                  userId={userId}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop minimized version
  if (isMinimized) {
    return (
      <div className="w-20 bg-white border-l border-gray-200 flex flex-col items-center py-6 hidden md:flex shadow-sm">
        <button
          onClick={() => setIsMinimized(false)}
          className="p-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 transition-all duration-200 shadow-sm hover:shadow-md"
          title="Open Lio"
        >
          <span className="text-2xl">🦁</span>
        </button>
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-500 font-medium writing-mode-vertical transform rotate-180">
            Lio
          </span>
        </div>
      </div>
    );
  }

  // Desktop expanded/collapsed version - Now with better sizing for hero feature
  return (
    <div className={`bg-white border-l border-gray-200 flex-col transition-all duration-300 hidden md:flex shadow-lg ${
      isExpanded ? 'w-[600px]' : 'w-[500px]'
    }`}>
      {/* AI Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-xl">🦁</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Lio</h3>
            <p className="text-sm text-gray-600">Your Literary Companion</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-amber-100 transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 rounded-lg hover:bg-amber-100 transition-colors"
            title="Minimize"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* AI Assistant Content */}
      <div className="flex-1 overflow-hidden">
        <AIAssistant
          bookId={bookId}
          currentChunkIndex={currentChunkIndex}
          userTier={userTier}
          readingMode={readingMode}
          knowledgeLens={knowledgeLens}
          userId={userId}
        />
      </div>
    </div>
  );
} 