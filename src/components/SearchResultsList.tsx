'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import type { BookStatus } from '../app/discover/DiscoverClientPage'; // Import BookStatus

// Data structures - these should ideally be in a shared types file
interface Author {
  name: string;
  birth_year?: number;
  death_year?: number;
}

export interface GutendexBook {
  id: number;
  title: string;
  authors: Author[];
  subjects: string[];
  languages: string[];
  media_type: string;
  download_count?: number;
  // formats: { [key: string]: string }; // Potentially needed later
}

interface SearchResultsListProps {
  gutendexResults: GutendexBook[];
  isLoading: boolean;
  error: string | null;
  addBookStatus: { [key: string]: BookStatus }; // Updated type
  handleAddGutendexBook: (book: GutendexBook) => Promise<void>;
  searchAttempted: boolean; // To know if a search has been made
}

const SearchResultsList = forwardRef<HTMLDivElement, SearchResultsListProps>((
  { gutendexResults, isLoading, error, addBookStatus, handleAddGutendexBook, searchAttempted }, 
  ref
) => {
  // Known success messages
  const EXACT_SUCCESS_MESSAGE = "Book added to your library successfully!";
  const FALLBACK_SUCCESS_MESSAGE = "Added to Library!";
  // Add other known success messages if the API might return them for a 200/201
  const INGESTING_MESSAGE = "Book ingestion started. Check your library later.";
  const ALREADY_IN_LIBRARY_MESSAGE = "Book is already in your library.";

  return (
    <div ref={ref} className="mt-8 pt-8 border-t border-gray-200">
      {isLoading && <p className="text-center text-gray-600 py-4">Loading search results...</p>}
      {error && <p className="text-red-500 text-center py-4">{error}</p>}

      {!isLoading && !error && gutendexResults.length > 0 && (
        <ul className="space-y-4">
          {gutendexResults.map((book) => {
            const bookKey = `gutendex-${book.id}`;
            const statusObject = addBookStatus[bookKey];
            const currentMessage = statusObject?.message;
            const bookIdForLink = statusObject?.bookId;

            const isDirectSuccess = currentMessage === EXACT_SUCCESS_MESSAGE || 
                                  currentMessage === FALLBACK_SUCCESS_MESSAGE;
            
            // Consider already in library (with a bookId) as a state where reading is possible
            const canRead = bookIdForLink && (isDirectSuccess || currentMessage === ALREADY_IN_LIBRARY_MESSAGE);
            const showPrimaryButton = !isDirectSuccess && currentMessage !== INGESTING_MESSAGE && currentMessage !== ALREADY_IN_LIBRARY_MESSAGE;

            return (
              <li key={bookKey} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-sky-700 hover:text-sky-800">{book.title}</h2>
                    <p className="text-sm text-gray-600">
                      by {book.authors.map(a => a.name).join(', ')}
                    </p>
                    <p className="text-xs text-gray-500">Languages: {book.languages.join(', ')}</p>
                    {book.download_count && <p className="text-xs text-gray-500">Downloads: {book.download_count}</p>}
                  </div>
                  <div className="ml-4 flex flex-col items-end space-y-1.5">
                    {(isDirectSuccess || currentMessage === ALREADY_IN_LIBRARY_MESSAGE || currentMessage === INGESTING_MESSAGE) && (
                        <span 
                            className={`text-sm font-medium ${isDirectSuccess || currentMessage === ALREADY_IN_LIBRARY_MESSAGE ? 'text-green-600' : 'text-blue-600'}`}
                        >
                            {currentMessage}
                        </span>
                    )}
                    
                    {canRead && (
                        <Link href={`/reader/${bookIdForLink}`} legacyBehavior>
                          <a className="inline-block px-3 py-1.5 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors whitespace-nowrap">
                            Start Reading Now!
                          </a>
                        </Link>
                    )}

                    {(isDirectSuccess || currentMessage === ALREADY_IN_LIBRARY_MESSAGE) && (
                        <Link href="/library" legacyBehavior>
                          <a className="inline-block px-3 py-1.5 text-xs bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors whitespace-nowrap">
                            Go to Library
                          </a>
                        </Link>
                    )}
                    
                    {showPrimaryButton && (
                      <button
                        onClick={() => handleAddGutendexBook(book)}
                        disabled={!!currentMessage && currentMessage !== 'Failed' && currentMessage !== 'Failed (Auth)'}
                        className="px-3 py-1.5 text-sm bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-gray-300 disabled:text-gray-500 whitespace-nowrap transition-colors"
                      >
                        {currentMessage || 'Add to Library'}
                      </button>
                    )}
                  </div>
                </div>
                {book.subjects && book.subjects.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      Subjects: {book.subjects.slice(0, 5).join(', ')}{book.subjects.length > 5 ? '...' : ''}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && !error && gutendexResults.length === 0 && searchAttempted && (
        <p className="text-gray-500 text-center py-4">No results found. Try a different search or category.</p>
      )}
      
      {/* Optional: Message when no search has been attempted yet and no results (if needed, but might be redundant if search bar is always active) */}
      {/* {!isLoading && !error && gutendexResults.length === 0 && !searchAttempted && (
        <p className="text-gray-500 text-center py-4">Use the search bar above or select a category to discover books.</p>
      )} */}
    </div>
  );
});

SearchResultsList.displayName = 'SearchResultsList';
export default SearchResultsList; 