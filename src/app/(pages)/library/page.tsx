'use client';

import { useEffect, useState } from 'react';
import BookCard, { BookCardProps } from "../../components/library/BookCard";
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';
import { useAuth } from '@/app/components/auth/AuthProvider';
import Link from 'next/link';

// Define the expected structure of an author object from the database
interface AuthorInfo {
  name: string;
  // Add other author properties if available, e.g., birth_year, death_year
}

// Define the structure of the 'public_books' object when joined
interface PublicBookJoined {
  id: number;
  gutenberg_id?: number;
  title: string;
  authors?: AuthorInfo[];
  subjects?: string[];
  cover_image_url?: string;
}

// Define the structure of the items returned by the Supabase query
interface FetchedUserBook {
  id: number; // This is the user_books.id
  public_book_db_id: number;
  added_at: string;
  reading_progress_percent?: number;
  is_pinned?: boolean;
  public_books: PublicBookJoined | null; // The joined public_book data can be null
}

export default function LibraryPage() {
  const { session, supabase, isLoading: authLoading } = useAuth();
  const [userBooks, setUserBooks] = useState<BookCardProps[]>([]); // Use BookCardProps directly for state
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  console.log('[LibraryPage] Component rendered. authLoading:', authLoading, 'isLoadingBooks:', isLoadingBooks, 'Session user ID:', session?.user?.id);

  useEffect(() => {
    console.log('[LibraryPage] useEffect triggered. Deps - authLoading:', authLoading, 'Session user ID:', session?.user?.id, 'Supabase defined:', !!supabase);
    if (session?.user && supabase) {
      console.log('[LibraryPage] Condition 1 MET: session.user and supabase exist. Fetching books...');
      const fetchUserBooks = async () => {
        console.log('[LibraryPage] fetchUserBooks called.');
        setIsLoadingBooks(true);
        setError(null);
        try {
          const { data, error: dbError } = await supabase
            .from('user_books')
            .select(`
              id,
              public_book_db_id,
              added_at,
              reading_progress_percent,
              is_pinned,
              public_books (
                id,
                gutenberg_id,
                title,
                authors,
                subjects,
                cover_image_url
              )
            `)
            .eq('user_id', session.user.id)
            .order('added_at', { ascending: false })
            .returns<FetchedUserBook[]>();

          console.log('[LibraryPage] Supabase query result - data:', data, 'error:', dbError);

          if (dbError) {
            throw dbError;
          }

          if (data) {
            // Filter out items where public_books might be null (e.g., due to a failed join or bad data)
            // And then map, ensuring item.public_books is treated as non-null within the map
            const formattedBooks: BookCardProps[] = data
              .filter((item): item is FetchedUserBook & { public_books: PublicBookJoined } => item.public_books !== null)
              .map((item) => ({
                id: item.public_books.id.toString(), // item.public_books is now PublicBookJoined (non-null)
                title: item.public_books.title,
                author: item.public_books.authors?.map((a) => a.name).join(', ') || 'Unknown Author',
                genre: item.public_books.subjects?.[0] || 'N/A',
                readingProgress: item.reading_progress_percent || 0,
                isPinned: item.is_pinned || false,
                coverImageUrl: item.public_books.cover_image_url,
              }));
            setUserBooks(formattedBooks);
            console.log('[LibraryPage] Books formatted and set to state:', formattedBooks);
          } else {
            setUserBooks([]);
            console.log('[LibraryPage] No data from query, setting empty books array.');
          }
        } catch (e: unknown) {
          console.error("[LibraryPage] Error fetching user books:", e);
          if (e instanceof Error) {
            setError(e.message);
          } else {
            setError('Failed to fetch books due to an unexpected error.');
          }
          setUserBooks([]);
        } finally {
          setIsLoadingBooks(false);
          console.log('[LibraryPage] fetchUserBooks finished, isLoadingBooks set to false.');
        }
      };

      fetchUserBooks();
    } else if (!authLoading && !session) {
      console.log('[LibraryPage] Condition 2 MET: Not authLoading and no session. Setting isLoadingBooks false.');
      setIsLoadingBooks(false);
      setUserBooks([]);
    } else {
      console.log('[LibraryPage] useEffect conditions NOT MET. authLoading:', authLoading, 'Session user ID:', session?.user?.id);
    }
  }, [session, supabase, authLoading]);

  if (authLoading || isLoadingBooks) {
    console.log('[LibraryPage] Render: Loading state. authLoading:', authLoading, 'isLoadingBooks:', isLoadingBooks);
    return (
      <ProtectedRoute> {/* Ensures redirect if not logged in after authLoading */}
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className="text-xl text-gray-600">Loading library...</p>
        </div>
      </ProtectedRoute>
    );
  }
  
  // Error state after loading
  if (error && !isLoadingBooks) {
    return (
      <ProtectedRoute>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center px-4">
          <p className="text-xl text-red-600 mb-4">Error loading library: {error}</p>
          <p className="text-gray-500">Please try refreshing the page. If the problem persists, contact support.</p>
        </div>
      </ProtectedRoute>
    );
  }


  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Library</h1>
          {/* Optional: Add filter/sort controls here later */}
        </div>

        {userBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
            {userBooks.map((book) => (
              <BookCard key={book.id} {...book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 min-h-[calc(100vh-300px)] flex flex-col items-center justify-center">
            <BookIcon className="w-20 h-20 text-gray-400 mb-6" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">Your Library is Empty</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              It looks like you haven&apos;t added any books yet. 
              Start by discovering books from Project Gutenberg or uploading your own.
            </p>
            <div className="flex space-x-4">
              <Link href="/discover"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm transition-colors"
              >
                Discover Books
              </Link>
              {/* Placeholder for upload link - implement when upload feature is ready */}
              {/* <Link href="/upload-book" 
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md shadow-sm transition-colors"
              >
                Upload Your Book
              </Link> */}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// Add a simple BookIcon component if not already globally available or imported
// For example:
const BookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.522c0 .318.219.596.526.7B4.26 19.998 6 20.25a9.735 9.735 0 0 0 3.25-.555.75.75 0 0 0 .5-.707V5.24a.75.75 0 0 0-.526-.707Zm1.5 0-.001 14.523a.75.75 0 0 0 .527.707c.25.085.516.15.79.208L15 20.25a9.735 9.735 0 0 0 3.25-.555.75.75 0 0 0 .5-.707V5.24a.75.75 0 0 0-.526-.707A9.707 9.707 0 0 0 18 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707ZM15 5.25a.75.75 0 0 0-.75.75v11.25l.001.002a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75Z" />
    <path d="M3 5.25a.75.75 0 0 0-.75.75v11.25l.001.002a.75.75 0 0 0 .75-.75V6A.75.75 0 0 0 3 5.25Z" />
  </svg>
); 