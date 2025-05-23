'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { createSupabaseBrowserClient } from '../utils/supabase/client'; // Ensure this path is correct

interface Author {
  name: string;
  birth_year?: number;
  death_year?: number;
}

interface Book {
  id: number; // This is public_books.id (our DB ID)
  gutenberg_id: number;
  title: string;
  authors: Author[];
  subjects?: string[];
  // Add other fields you want to display from the search results
}

interface SearchResult {
  books: Book[];
}

export default function BookSearchDiscover() {
  const supabase = createSupabaseBrowserClient(); // For client-side API calls if needed, or general Supabase interactions
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [results, setResults] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [addBookStatus, setAddBookStatus] = useState<{[key: number]: string}>({}); // Tracks status per book ID

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchTerm.trim().length < 2) {
      setError('Search term must be at least 2 characters.');
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults([]);
    setAddBookStatus({});

    try {
      const response = await fetch(`/api/public-books/search?searchTerm=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Error: ${response.status}`);
      }
      const data: SearchResult = await response.json();
      setResults(data.books || []);
      if (!data.books || data.books.length === 0) {
        setError('No books found matching your search criteria.');
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      setError(err.message || 'Failed to fetch search results.');
      setResults([]);
    }
    setIsLoading(false);
  };

  const handleAddBook = async (bookDbId: number) => {
    setAddBookStatus(prev => ({ ...prev, [bookDbId]: 'Adding...' }));
    setError(null); // Clear general errors

    try {
      // No need to create a Supabase client here specifically for this fetch call,
      // as the browser will send cookies automatically for same-origin requests.
      // The API route /api/user-library/add-public-book handles auth using cookies.
      const response = await fetch('/api/user-library/add-public-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_book_db_id: bookDbId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) { // Unauthorized
            setError('Please log in to add books to your library.');
            setAddBookStatus(prev => ({ ...prev, [bookDbId]: 'Failed (Auth)' }));
        } else if (response.status === 409) { // Already exists (Conflict)
            setAddBookStatus(prev => ({ ...prev, [bookDbId]: 'Already in library' }));
        } else {
            setError(data.error || `Error adding book: ${response.status}`);
            setAddBookStatus(prev => ({ ...prev, [bookDbId]: 'Failed' }));
        }
        return; 
      }
      setAddBookStatus(prev => ({ ...prev, [bookDbId]: 'Added!' }));

    } catch (err: any) {
      console.error('Failed to add book:', err);
      setError(err.message || 'An unexpected error occurred while adding the book.');
      setAddBookStatus(prev => ({ ...prev, [bookDbId]: 'Failed' }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="search"
          value={searchTerm}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          placeholder="Search by title or author (e.g., Dracula, Stoker)"
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

      {results.length > 0 && (
        <ul className="space-y-4">
          {results.map((book) => (
            <li key={book.id} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-indigo-700">{book.title}</h2>
                  <p className="text-sm text-gray-600">
                    by {book.authors.map(a => a.name).join(', ')}
                  </p>
                  {book.gutenberg_id && <p className="text-xs text-gray-500">Gutenberg ID: {book.gutenberg_id}</p>}
                </div>
                <button
                  onClick={() => handleAddBook(book.id)}
                  disabled={addBookStatus[book.id] === 'Adding...' || addBookStatus[book.id] === 'Added!' || addBookStatus[book.id] === 'Already in library'}
                  className="ml-4 px-3 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 whitespace-nowrap"
                >
                  {addBookStatus[book.id] || 'Add to Library'}
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
    </div>
  );
} 