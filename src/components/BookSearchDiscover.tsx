'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
// import { createSupabaseBrowserClient } from '../utils/supabase/client'; // Ensure this path is correct

interface Author {
  name: string;
  birth_year?: number;
  death_year?: number;
}

// For books from our local DB (public_books)
interface LocalBook {
  id: number; // This is public_books.id (our DB ID)
  gutenberg_id: number;
  title: string;
  authors: Author[];
  subjects?: string[];
  // Add other fields you want to display from the search results
}

// For books directly from Gutendex API
interface GutendexBook {
  id: number; // This is gutenberg_id from Gutendex
  title: string;
  authors: Author[];
  subjects: string[];
  languages: string[];
  download_count?: number;
  // formats: { [key: string]: string }; // Can be added if we need to show specific format URLs
}

interface LocalSearchResult {
  books: LocalBook[];
}

interface GutendexSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

type SearchSource = 'local' | 'gutendex';

export default function BookSearchDiscover() {
  // const supabase = createSupabaseBrowserClient(); // Commented out as unused
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [localResults, setLocalResults] = useState<LocalBook[]>([]);
  const [gutendexResults, setGutendexResults] = useState<GutendexBook[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [addBookStatus, setAddBookStatus] = useState<{[key: string]: string}>({}); // Tracks status per book ID (gutenberg_id for Gutendex, local_id for local)
  const [searchSource, setSearchSource] = useState<SearchSource>('local');

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchTerm.trim().length < 2) {
      setError('Search term must be at least 2 characters.');
      setLocalResults([]);
      setGutendexResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    setLocalResults([]);
    setGutendexResults([]);
    setAddBookStatus({});

    if (searchSource === 'local') {
      await searchLocalDatabase();
    } else {
      await searchGutendex();
    }
    setIsLoading(false);
  };

  const searchLocalDatabase = async () => {
    try {
      const response = await fetch(`/api/public-books/search?searchTerm=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Error: ${response.status}`);
      }
      const data: LocalSearchResult = await response.json();
      setLocalResults(data.books || []);
      if (!data.books || data.books.length === 0) {
        setError('No books found in local library matching your search criteria.');
      }
    } catch (err: unknown) {
      console.error('Local search failed:', err);
      const message = (err instanceof Error) ? err.message : 'Failed to fetch local search results.';
      setError(message);
      setLocalResults([]);
    }
  };

  const searchGutendex = async () => {
    try {
      const response = await fetch(`https://gutendex.com/books?search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error(`Gutendex API Error: ${response.status}`);
      }
      const data: GutendexSearchResult = await response.json();
      setGutendexResults(data.results || []);
      if (!data.results || data.results.length === 0) {
        setError('No books found on Project Gutenberg matching your search criteria.');
      }
    } catch (err: unknown) {
      console.error('Gutendex search failed:', err);
      const message = (err instanceof Error) ? err.message : 'Failed to fetch Gutendex search results.';
      setError(message);
      setGutendexResults([]);
    }
  };

  // TODO: This handleAddBook needs to be adapted or split
  // For now, it assumes local book ID. We'll create a new one for Gutendex results.
  const handleAddLocalBook = async (bookDbId: number) => {
    setAddBookStatus(prev => ({ ...prev, [`local-${bookDbId}`]: 'Adding...' }));
    setError(null);

    try {
      const response = await fetch('/api/user-library/add-public-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_book_db_id: bookDbId }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
            setError('Please log in to add books.');
            setAddBookStatus(prev => ({ ...prev, [`local-${bookDbId}`]: 'Failed (Auth)' }));
        } else if (response.status === 409) {
            setAddBookStatus(prev => ({ ...prev, [`local-${bookDbId}`]: 'In library' }));
        } else {
            setError(data.error || `Error: ${response.status}`);
            setAddBookStatus(prev => ({ ...prev, [`local-${bookDbId}`]: 'Failed' }));
        }
        return; 
      }
      setAddBookStatus(prev => ({ ...prev, [`local-${bookDbId}`]: 'Added!' }));
    } catch (err: unknown) {
      console.error('Failed to add local book:', err);
      const message = (err instanceof Error) ? err.message : 'Error adding book.';
      setError(message);
      setAddBookStatus(prev => ({ ...prev, [`local-${bookDbId}`]: 'Failed' }));
    }
  };
  
  // New handler for adding books from Gutendex search results
  const handleAddGutendexBook = async (book: GutendexBook) => {
    const bookKey = `gutendex-${book.id}`;
    setAddBookStatus(prev => ({ ...prev, [bookKey]: 'Processing...' }));
    setError(null);

    try {
      // This will be the new API endpoint we create next
      const response = await fetch('/api/user-library/add-from-gutenberg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gutenberg_id: book.id,
          title: book.title,
          authors: book.authors,
          subjects: book.subjects,
          languages: book.languages,
          // We might need to pass more metadata if our public_books table requires it for the initial insert
          // before ingestion adds more details like raw_text_url from a secondary Gutendex call.
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to add books.');
          setAddBookStatus(prev => ({ ...prev, [bookKey]: 'Failed (Auth)' }));
        } else if (response.status === 409) { // Already in user library or ingestion conflict if handled that way
          setAddBookStatus(prev => ({ ...prev, [bookKey]: data.message || 'In library' }));
        } else if (response.status === 202) { // Accepted for processing (ingestion started)
           setAddBookStatus(prev => ({ ...prev, [bookKey]: 'Ingesting... Check Library Later' }));
        } else {
          setError(data.error || `Error: ${response.status}`);
          setAddBookStatus(prev => ({ ...prev, [bookKey]: 'Failed' }));
        }
        return;
      }
      // If 201 Created (directly added and ingested) or 200 OK (already ingested and added to user lib)
      setAddBookStatus(prev => ({ ...prev, [bookKey]: data.message || 'Added to Library!' })); 

    } catch (err: unknown) {
      console.error('Failed to add Gutendex book:', err);
      const message = (err instanceof Error) ? err.message : 'Error processing book.';
      setError(message);
      setAddBookStatus(prev => ({ ...prev, [bookKey]: 'Failed' }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-md shadow-sm bg-white p-1 border border-gray-200">
          <button
            onClick={() => setSearchSource('local')}
            className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
              ${
                searchSource === 'local'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-indigo-50'
              }`}
          >
            Search My Library Cache
          </button>
          <button
            onClick={() => setSearchSource('gutendex')}
            className={`px-4 py-2 text-sm font-medium rounded-r-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
              ${
                searchSource === 'gutendex'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-indigo-50'
              }`}
          >
            Search Project Gutenberg
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="search"
          value={searchTerm}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          placeholder={searchSource === 'local' ? "Search local cache..." : "Search Gutenberg (e.g., Moby Dick, Melville)"}
          className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      {searchSource === 'local' && localResults.length > 0 && (
        <ul className="space-y-4">
          {localResults.map((book) => (
            <li key={`local-${book.id}`} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-indigo-700">{book.title}</h2>
                  <p className="text-sm text-gray-600">
                    by {book.authors.map(a => a.name).join(', ')}
                  </p>
                  {book.gutenberg_id && <p className="text-xs text-gray-500">Gutenberg ID: {book.gutenberg_id}</p>}
                </div>
                <button
                  onClick={() => handleAddLocalBook(book.id)}
                  disabled={addBookStatus[`local-${book.id}`] === 'Adding...' || addBookStatus[`local-${book.id}`] === 'Added!' || addBookStatus[`local-${book.id}`] === 'In library'}
                  className="ml-4 px-3 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 whitespace-nowrap"
                >
                  {addBookStatus[`local-${book.id}`] || 'Add to Library'}
                </button>
              </div>
              {book.subjects && book.subjects.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">
                    Subjects: {book.subjects.slice(0, 5).join(', ')}{book.subjects.length > 5 ? '...' : ''}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {searchSource === 'gutendex' && gutendexResults.length > 0 && (
        <ul className="space-y-4">
          {gutendexResults.map((book) => {
            const bookKey = `gutendex-${book.id}`;
            return (
              <li key={bookKey} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-sky-700">{book.title}</h2>
                    <p className="text-sm text-gray-600">
                      by {book.authors.map(a => a.name).join(', ')}
                    </p>
                    <p className="text-xs text-gray-500">Languages: {book.languages.join(', ')}</p>
                    {book.download_count && <p className="text-xs text-gray-500">Downloads: {book.download_count}</p>}
                  </div>
                  <button
                    onClick={() => handleAddGutendexBook(book)}
                    disabled={!!addBookStatus[bookKey] && addBookStatus[bookKey] !== 'Failed' && addBookStatus[bookKey] !== 'Failed (Auth)'}
                    className="ml-4 px-3 py-1.5 text-sm bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-gray-300 disabled:text-gray-500 whitespace-nowrap"
                  >
                    {addBookStatus[bookKey] || 'Add to Library'}
                  </button>
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
    </div>
  );
} 