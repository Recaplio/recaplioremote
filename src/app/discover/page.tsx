'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SparklesIcon, TagIcon, FireIcon, LightBulbIcon, AcademicCapIcon, BookOpenIcon, UserCircleIcon } from '@heroicons/react/24/outline';

import SearchForm from '../../components/SearchForm';
import SearchResultsList, { GutendexBook } from '../../components/SearchResultsList';
// Note: createSupabaseServerClient and redirect are server-side, so auth check needs rethinking for client component or a wrapper.
// For now, focusing on search layout. Auth aspect will be revisited if page is fully client-side.

// Gutendex API structures (could be in a shared types.ts)
interface GutendexSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

const quickSearchCategories = [
  { name: 'Most Popular', href: '/discover?popular=true', icon: FireIcon, bgColor: 'bg-red-50 hover:bg-red-100', textColor: 'text-red-700' },
  { name: 'Classic Fiction', href: '/discover?topic=Fiction', icon: BookOpenIcon, bgColor: 'bg-sky-50 hover:bg-sky-100', textColor: 'text-sky-700' },
  { name: 'Science Fiction', href: '/discover?topic=Science%20Fiction', icon: SparklesIcon, bgColor: 'bg-purple-50 hover:bg-purple-100', textColor: 'text-purple-700' },
  { name: 'History', href: '/discover?topic=History', icon: AcademicCapIcon, bgColor: 'bg-amber-50 hover:bg-amber-100', textColor: 'text-amber-700' },
  { name: 'Philosophy', href: '/discover?topic=Philosophy', icon: LightBulbIcon, bgColor: 'bg-green-50 hover:bg-green-100', textColor: 'text-green-700' },
  { name: 'Mystery', href: '/discover?topic=Mystery', icon: TagIcon, bgColor: 'bg-blue-50 hover:bg-blue-100', textColor: 'text-blue-700' },
];

const famousAuthors = [
  { name: 'Jane Austen', description: 'Classic romantic fiction & social commentary.', href: '/discover?query=Jane%20Austen', icon: UserCircleIcon, bgColor: 'bg-pink-50 hover:bg-pink-100', textColor: 'text-pink-700' },
  { name: 'Charles Dickens', description: 'Victorian-era novels, rich characters & social critique.', href: '/discover?query=Charles%20Dickens', icon: UserCircleIcon, bgColor: 'bg-teal-50 hover:bg-teal-100', textColor: 'text-teal-700' },
  { name: 'Mark Twain', description: 'Iconic American literature, humor & adventure.', href: '/discover?query=Mark%20Twain', icon: UserCircleIcon, bgColor: 'bg-orange-50 hover:bg-orange-100', textColor: 'text-orange-700' },
  { name: 'Arthur Conan Doyle', description: 'Creator of detective Sherlock Holmes (early stories).', href: '/discover?query=Arthur%20Conan%20Doyle', icon: UserCircleIcon, bgColor: 'bg-stone-50 hover:bg-stone-100', textColor: 'text-stone-700' },
  { name: 'Edgar Allan Poe', description: 'Master of mystery, macabre, and short stories.', href: '/discover?query=Edgar%20Allan%20Poe', icon: UserCircleIcon, bgColor: 'bg-slate-50 hover:bg-slate-100', textColor: 'text-slate-700' },
  { name: 'Augustine of Hippo', description: 'Influential Christian theologian & philosopher (Confessions, City of God).', href: '/discover?query=Augustine%20of%20Hippo', icon: UserCircleIcon, bgColor: 'bg-lime-50 hover:bg-lime-100', textColor: 'text-lime-700' },
  { name: 'Plato', description: 'Ancient Greek philosopher, foundational texts.', href: '/discover?query=Plato', icon: UserCircleIcon, bgColor: 'bg-indigo-50 hover:bg-indigo-100', textColor: 'text-indigo-700' },
  { name: 'Marcus Aurelius', description: 'Roman Emperor & Stoic philosopher (Meditations).', href: '/discover?query=Marcus%20Aurelius', icon: UserCircleIcon, bgColor: 'bg-rose-50 hover:bg-rose-100', textColor: 'text-rose-700' },
  { name: 'Henry David Thoreau', description: 'American transcendentalist writer (Walden).', href: '/discover?query=Henry%20David%20Thoreau', icon: UserCircleIcon, bgColor: 'bg-cyan-50 hover:bg-cyan-100', textColor: 'text-cyan-700' },
  { name: 'Leo Tolstoy', description: 'Iconic Russian novelist (War and Peace, Anna Karenina).', href: '/discover?query=Leo%20Tolstoy', icon: UserCircleIcon, bgColor: 'bg-amber-50 hover:bg-amber-100', textColor: 'text-amber-800' },
];

export default function DiscoverPage() {
  const searchParams = useSearchParams();
  const resultsListRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [gutendexResults, setGutendexResults] = useState<GutendexBook[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [addBookStatus, setAddBookStatus] = useState<{ [key: string]: string }>({});
  const [searchAttempted, setSearchAttempted] = useState<boolean>(false); // New state

  // Auth check would typically be in a wrapper or handled differently for client components
  // const supabase = createSupabaseServerClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) { return redirect('/'); }

  const scrollToResults = () => {
    resultsListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const searchGutendex = async (termToSearch: string | null, searchType: 'topic' | 'search' | 'popular') => {
    setIsLoading(true);
    setError(null);
    // setGutendexResults([]); // Clear results at the beginning of a new search action
    setSearchAttempted(true);
    let query = termToSearch ? termToSearch.trim() : '';

    try {
      let apiUrl = 'https://gutendex.com/books?';
      const params = new URLSearchParams();

      if (searchType === 'popular') {
        params.append('sort', 'popular');
      } else if (searchType === 'topic' && query) {
        params.append('topic', query);
      } else if (searchType === 'search' && query) {
        params.append('search', query);
      } else {
        setError('Invalid search operation.');
        setGutendexResults([]);
        setIsLoading(false);
        return;
      }
      params.append('mime_type', 'text/');
      apiUrl += params.toString();
      
      console.log("[DiscoverPage] Fetching Gutendex URL:", apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[DiscoverPage] Gutendex API Error Response:", errorText);
        throw new Error(`Gutendex API Error: ${response.status} - ${response.statusText}`);
      }
      const data: GutendexSearchResult = await response.json();
      const books = data.results || [];
      setGutendexResults(books);

      if (books.length === 0) {
        if (searchType === 'popular') {
            setError('Could not fetch popular books at this time, or none found with text format.');
        } else {
            setError(`No text-based books found on Project Gutenberg for "${query}".`);
        }
      } else {
        setError(null);
        scrollToResults(); // Scroll when results are successfully fetched
      }
    } catch (err: unknown) {
      console.error('Gutendex search failed:', err);
      const message = (err instanceof Error) ? err.message : 'Failed to fetch Gutendex search results.';
      setError(message);
      setGutendexResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const queryParam = searchParams.get('query');
    const popularParam = searchParams.get('popular');

    // Clear previous results for new navigation-triggered search
    setGutendexResults([]);
    setError(null);
    setSearchAttempted(false); // Reset search attempted for URL-triggered searches

    let performedSearch = false;
    if (topicParam) {
      setSearchTerm(topicParam);
      searchGutendex(topicParam, 'topic');
      performedSearch = true;
    } else if (queryParam) {
      setSearchTerm(queryParam);
      searchGutendex(queryParam, 'search');
      performedSearch = true;
    } else if (popularParam === 'true') {
      setSearchTerm(''); // No specific search term for popular
      searchGutendex(null, 'popular');
      performedSearch = true;
    }

    if (performedSearch) {
      setSearchAttempted(true);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Dependency: searchParams

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchTerm.trim().length === 0) {
        setError("Please enter a search term.");
        setGutendexResults([]);
        setSearchAttempted(true);
        return;
    }
    // Clear previous results for new manual search
    setGutendexResults([]); 
    setError(null);
    searchGutendex(searchTerm, 'search');
  };

  const handleAddGutendexBook = async (book: GutendexBook) => {
    const bookKey = `gutendex-${book.id}`;
    setAddBookStatus(prev => ({ ...prev, [bookKey]: 'Processing...' }));
    setError(null); // Clear general errors when trying to add a book

    try {
      const response = await fetch('/api/user-library/add-from-gutenberg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gutenberg_id: book.id,
          title: book.title,
          authors: book.authors,
          subjects: book.subjects,
          languages: book.languages,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        let specificError = data.error || `Error adding book: ${response.status}`;
        if (response.status === 401) specificError = 'Please log in to add books.';
        if (response.status === 409) specificError = data.message || 'Book is already in your library.';
        if (response.status === 202) specificError = data.message || 'Book ingestion started. Check your library later.'; 
        
        setAddBookStatus(prev => ({ ...prev, [bookKey]: response.status === 409 || response.status === 202 ? data.message : 'Failed' }));
        // Optionally set a more specific error for this book, or a general one
        // For now, button status shows individual book issues
        if (response.status !== 409 && response.status !== 202) setError(specificError);
        return;
      }
      setAddBookStatus(prev => ({ ...prev, [bookKey]: data.message || 'Added to Library!' }));
    } catch (err: unknown) {
      console.error('Failed to add Gutendex book:', err);
      const message = (err instanceof Error) ? err.message : 'Error processing book.';
      setError(message); // General error
      setAddBookStatus(prev => ({ ...prev, [bookKey]: 'Failed' }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-3">
          Explore a Universe of Books
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Search Project Gutenberg&apos;s vast library or browse by popular topics and authors to find your next great read.
        </p>
      </div>

      <div className="mb-10">
        <SearchForm 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          handleSearchSubmit={handleSearchSubmit} 
          isLoading={isLoading} 
        />
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Explore by Topic</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {quickSearchCategories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className={`flex flex-col items-center justify-center p-4 rounded-lg shadow-sm transition-all duration-150 ease-in-out transform hover:scale-105 ${category.bgColor}`}
            >
              <category.icon className={`h-8 w-8 mb-2 ${category.textColor}`} aria-hidden="true" />
              <span className={`font-medium text-sm text-center ${category.textColor}`}>{category.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Explore by Famous Authors</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {famousAuthors.map((author) => (
            <Link
              key={author.name}
              href={author.href}
              className={`flex flex-col p-4 rounded-lg shadow-sm transition-all duration-150 ease-in-out transform hover:scale-105 ${author.bgColor}`}
            >
              <div className="flex items-center mb-2">
                <author.icon className={`h-7 w-7 mr-3 ${author.textColor}`} aria-hidden="true" />
                <span className={`font-semibold text-md ${author.textColor}`}>{author.name}</span>
              </div>
              <p className={`text-xs ${author.textColor} opacity-80`}>{author.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Search Results - MOVED HERE, below quick explore sections */}
      {/* Only render if a search has been attempted or is loading, or if there are results/errors */}
      {(searchAttempted || isLoading || gutendexResults.length > 0 || error) && (
        <SearchResultsList
          ref={resultsListRef}
          gutendexResults={gutendexResults}
          isLoading={isLoading}
          error={error}
          addBookStatus={addBookStatus}
          handleAddGutendexBook={handleAddGutendexBook}
          searchAttempted={searchAttempted}
        />
      )}
    </div>
  );
} 