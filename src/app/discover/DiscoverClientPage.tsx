'use client';

import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  SparklesIcon, 
  TagIcon, 
  LightBulbIcon, 
  AcademicCapIcon, 
  BookOpenIcon, 
  UserCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
  BookmarkIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { 
  FireIcon as FireIconSolid,
  StarIcon as StarIconSolid,
} from '@heroicons/react/24/solid';

import SearchForm from '../../components/SearchForm';
import SearchResultsList from '../../components/SearchResultsList';
// Note: We'll define GutendexBook locally to avoid circular imports

// Define GutendexBook interface locally to avoid circular imports
export interface GutendexBook {
  id: number;
  title: string;
  authors: { name: string; birth_year?: number; death_year?: number }[];
  subjects: string[];
  languages: string[];
  media_type: string;
  download_count?: number;
}

// Define the structure for addBookStatus
export interface BookStatus {
  message: string;
  bookId?: number | string; // To store the ID for the reader link
}

interface ReadingGoal {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  icon: string;
  color: string;
}

interface TrendingBook {
  id: number;
  title: string;
  author: string;
  downloads: number;
  trend: 'up' | 'hot' | 'new';
  genre: string;
  rating: number;
  readTime: string;
}

// gutendex API structures (could be in a shared types.ts)
interface GutendexSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

// Enhanced categories with better visual design and descriptions
const discoveryCategories = [
  { 
    name: 'Trending Now', 
    href: '/discover?popular=true', 
    icon: ArrowTrendingUpIcon, 
    bgColor: 'bg-gradient-to-br from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100', 
    textColor: 'text-red-700',
    description: 'Most popular books this week',
    count: '2.3k readers'
  },
  { 
    name: 'Classic Literature', 
    href: '/discover?topic=Fiction', 
    icon: BookOpenIcon, 
    bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100', 
    textColor: 'text-blue-700',
    description: 'Timeless stories that shaped literature',
    count: '850+ books'
  },
  { 
    name: 'Science Fiction', 
    href: '/discover?topic=Science%20Fiction', 
    icon: SparklesIcon, 
    bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100', 
    textColor: 'text-purple-700',
    description: 'Explore future worlds and possibilities',
    count: '320+ books'
  },
  { 
    name: 'Philosophy & Wisdom', 
    href: '/discover?topic=Philosophy', 
    icon: LightBulbIcon, 
    bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100', 
    textColor: 'text-amber-700',
    description: 'Deep thoughts from great minds',
    count: '180+ books'
  },
  { 
    name: 'History & Biography', 
    href: '/discover?topic=History', 
    icon: AcademicCapIcon, 
    bgColor: 'bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100', 
    textColor: 'text-emerald-700',
    description: 'Learn from the past',
    count: '420+ books'
  },
  { 
    name: 'Mystery & Adventure', 
    href: '/discover?topic=Mystery', 
    icon: TagIcon, 
    bgColor: 'bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100', 
    textColor: 'text-slate-700',
    description: 'Thrilling tales and puzzles',
    count: '290+ books'
  },
];

// Enhanced author profiles with more context
const featuredAuthors = [
  { 
    name: 'Jane Austen', 
    description: 'Master of wit, romance, and social commentary in Regency England.',
    speciality: 'Romance & Social Satire',
    href: '/discover?query=Jane%20Austen', 
    icon: UserCircleIcon, 
    bgColor: 'bg-gradient-to-br from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100', 
    textColor: 'text-rose-700',
    bookCount: 6,
    era: '1775-1817',
    mostFamous: 'Pride and Prejudice'
  },
  { 
    name: 'Charles Dickens', 
    description: 'Victorian storyteller who brought social issues to life through unforgettable characters.',
    speciality: 'Social Realism',
    href: '/discover?query=Charles%20Dickens', 
    icon: UserCircleIcon, 
    bgColor: 'bg-gradient-to-br from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100', 
    textColor: 'text-teal-700',
    bookCount: 15,
    era: '1812-1870',
    mostFamous: 'A Tale of Two Cities'
  },
  { 
    name: 'Mark Twain', 
    description: 'America&apos;s beloved humorist who captured the spirit of a growing nation.',
    speciality: 'American Humor',
    href: '/discover?query=Mark%20Twain', 
    icon: UserCircleIcon, 
    bgColor: 'bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100', 
    textColor: 'text-orange-700',
    bookCount: 12,
    era: '1835-1910',
    mostFamous: 'Adventures of Huckleberry Finn'
  },
  { 
    name: 'Arthur Conan Doyle', 
    description: 'Creator of the world&apos;s most famous detective and master of mystery.',
    speciality: 'Detective Fiction',
    href: '/discover?query=Arthur%20Conan%20Doyle', 
    icon: UserCircleIcon, 
    bgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100', 
    textColor: 'text-indigo-700',
    bookCount: 9,
    era: '1859-1930',
    mostFamous: 'The Adventures of Sherlock Holmes'
  },
];

// Mock data for enhanced features
const mockReadingGoals: ReadingGoal[] = [
  {
    id: '1',
    title: 'Classic Literature Explorer',
    description: 'Read 5 classic novels this year',
    progress: 2,
    target: 5,
    icon: '📚',
    color: 'bg-blue-500'
  },
  {
    id: '2',
    title: 'Philosophy Journey',
    description: 'Explore 3 philosophical works',
    progress: 1,
    target: 3,
    icon: '🧠',
    color: 'bg-purple-500'
  }
];

const mockTrendingBooks: TrendingBook[] = [
  {
    id: 1,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    downloads: 15420,
    trend: 'hot',
    genre: 'Romance',
    rating: 4.8,
    readTime: '8-10 hours'
  },
  {
    id: 2,
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    downloads: 12350,
    trend: 'up',
    genre: 'Mystery',
    rating: 4.7,
    readTime: '6-8 hours'
  },
  {
    id: 3,
    title: 'Frankenstein',
    author: 'Mary Shelley',
    downloads: 9870,
    trend: 'new',
    genre: 'Gothic',
    rating: 4.6,
    readTime: '7-9 hours'
  }
];

export default function DiscoverClientPage() {
  const searchParams = useSearchParams();
  const resultsListRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [gutendexResults, setGutendexResults] = useState<GutendexBook[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [addBookStatus, setAddBookStatus] = useState<{ [key: string]: BookStatus }>({});
  const [searchAttempted, setSearchAttempted] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'discover' | 'trending' | 'goals'>('discover');

  // Auth check would typically be in a wrapper or handled differently for client components
  // const supabase = createSupabaseServerClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) { return redirect('/'); }

  const scrollToResults = () => {
    resultsListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const searchGutendex = useCallback(async (termToSearch: string | null, searchType: 'topic' | 'search' | 'popular') => {
    setIsLoading(true);
    setError(null);
    setSearchAttempted(true);
    const query = termToSearch ? termToSearch.trim() : '';

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
      
      console.log("[DiscoverClientPage] Fetching gutendex URL:", apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[DiscoverClientPage] gutendex API Error Response:", errorText);
        throw new Error(`gutendex API Error: ${response.status} - ${response.statusText}`);
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
        scrollToResults();
      }
    } catch (err: unknown) {
      console.error('gutendex search failed:', err);
      const message = (err instanceof Error) ? err.message : 'Failed to fetch gutendex search results.';
      setError(message);
      setGutendexResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const queryParam = searchParams.get('query');
    const popularParam = searchParams.get('popular');

    setGutendexResults([]);
    setError(null);
    setSearchAttempted(false);

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
      setSearchTerm('');
      searchGutendex(null, 'popular');
      performedSearch = true;
    }

    if (performedSearch) {
      setSearchAttempted(true);
    }
  }, [searchParams, searchGutendex]);

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchTerm.trim().length === 0) {
        setError("Please enter a search term.");
        setGutendexResults([]);
        setSearchAttempted(true);
        return;
    }
    setGutendexResults([]); 
    setError(null);
    searchGutendex(searchTerm, 'search');
  };

  const handleAddGutendexBook = async (book: GutendexBook) => {
    const bookKey = `gutendex-${book.id}`;
    setAddBookStatus(prev => ({ ...prev, [bookKey]: { message: 'Adding...' } }));

    try {
      const response = await fetch('/api/user-library/add-from-gutenberg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gutenberg_id: book.id,
          title: book.title,
          authors: book.authors,
          languages: book.languages,
          subjects: book.subjects,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add book');
      }

      const data = await response.json();
      setAddBookStatus(prev => ({ 
        ...prev, 
        [bookKey]: { 
          message: data.message,
          bookId: data.user_book_id 
        } 
      }));
    } catch (err: unknown) {
      console.error('Failed to add gutendex book:', err);
      const message = (err instanceof Error) ? err.message : 'Error processing book.';
      setError(message);
      setAddBookStatus(prev => ({ ...prev, [bookKey]: { message: 'Failed' } }));
    }
  };

  // Add handler for trending books
  const handleAddTrendingBook = async (book: TrendingBook) => {
    // Convert TrendingBook to GutendexBook format for the existing handler
    const gutendexBook: GutendexBook = {
      id: book.id,
      title: book.title,
      authors: [{ name: book.author, birth_year: undefined, death_year: undefined }],
      languages: ['en'], // Default to English for trending books
      subjects: [book.genre],
      media_type: 'Text',
      download_count: book.downloads
    };
    
    await handleAddGutendexBook(gutendexBook);
  };

  // Add handler for reading goal recommendations
  const handleFindRecommendedBooks = (goalType: string) => {
    // Navigate to search with appropriate query based on goal type
    if (goalType.includes('Classic Literature')) {
      window.location.href = '/discover?topic=Fiction';
    } else if (goalType.includes('Philosophy')) {
      window.location.href = '/discover?topic=Philosophy';
    } else {
      window.location.href = '/discover?popular=true';
    }
  };

  // Add handler for suggested reading goals
  const handleAddReadingGoal = (goalTitle: string) => {
    // For now, just show an alert - in a real app this would save to user's goals
    alert(`Added "${goalTitle}" to your reading goals! This feature will be fully implemented soon.`);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'hot': return <FireIconSolid className="w-4 h-4 text-red-500" />;
      case 'up': return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'new': return <SparklesIcon className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative container mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6">
              Discover Your Next
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                Great Adventure
              </span>
            </h1>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto mb-8">
              Explore thousands of classic books with AI-powered insights. From timeless literature to philosophical masterpieces, find stories that will transform your thinking.
            </p>
            
            {/* Enhanced Search */}
            <div className="max-w-2xl mx-auto mb-8">
              <SearchForm 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                handleSearchSubmit={handleSearchSubmit} 
                isLoading={isLoading} 
              />
            </div>

            {/* Quick Stats */}
            <div className="flex justify-center space-x-8 text-indigo-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">60,000+</div>
                <div className="text-sm">Free Books</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">150+</div>
                <div className="text-sm">Languages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">AI-Powered</div>
                <div className="text-sm">Insights</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-full p-1 shadow-lg border border-gray-200">
            <div className="flex space-x-1">
                             {[
                 { id: 'discover', label: 'Discover', icon: GlobeAltIcon },
                 { id: 'trending', label: 'Trending', icon: ArrowTrendingUpIcon },
                 { id: 'goals', label: 'My Goals', icon: BookmarkIcon }
               ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as 'discover' | 'trending' | 'goals')}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                    activeView === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Discover View */}
        {activeView === 'discover' && (
          <>
            {/* Enhanced Categories */}
            <div className="mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore by Genre</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Dive into carefully curated collections that match your interests and reading goals.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {discoveryCategories.map((category) => (
                  <Link
                    key={category.name}
                    href={category.href}
                    className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${category.bgColor} border border-white/50`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${category.bgColor.replace('50', '100').replace('hover:from-', 'from-').replace('hover:to-', 'to-')}`}>
                        <category.icon className={`h-6 w-6 ${category.textColor}`} />
                      </div>
                      <ChevronRightIcon className={`w-5 h-5 ${category.textColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </div>
                    
                    <h3 className={`text-xl font-bold ${category.textColor} mb-2`}>
                      {category.name}
                    </h3>
                    <p className={`text-sm ${category.textColor} opacity-80 mb-3`}>
                      {category.description}
                    </p>
                    <div className={`text-xs ${category.textColor} opacity-60 font-medium`}>
                      {category.count}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Featured Authors */}
            <div className="mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Literary Masters</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Explore the works of history&apos;s greatest writers and thinkers.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featuredAuthors.map((author) => (
                  <Link
                    key={author.name}
                    href={author.href}
                    className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${author.bgColor} border border-white/50`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-xl ${author.bgColor.replace('50', '100').replace('hover:from-', 'from-').replace('hover:to-', 'to-')}`}>
                        <author.icon className={`h-8 w-8 ${author.textColor}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-xl font-bold ${author.textColor}`}>
                            {author.name}
                          </h3>
                          <ChevronRightIcon className={`w-5 h-5 ${author.textColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        </div>
                        
                        <p className={`text-sm ${author.textColor} opacity-80 mb-3`}>
                          {author.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs">
                          <span className={`${author.textColor} opacity-60`}>
                            📚 {author.bookCount} books
                          </span>
                          <span className={`${author.textColor} opacity-60`}>
                            📅 {author.era}
                          </span>
                        </div>
                        
                        <div className={`text-xs ${author.textColor} opacity-60 mt-2`}>
                          <strong>Most Famous:</strong> {author.mostFamous}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Trending View */}
        {activeView === 'trending' && (
          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Trending This Week</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                See what books are capturing readers&apos; attention right now.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockTrendingBooks.map((book, index) => (
                <div
                  key={book.id}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                      {getTrendIcon(book.trend)}
                    </div>
                    <div className="flex items-center space-x-1">
                      <StarIconSolid className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-700">{book.rating}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{book.title}</h3>
                  <p className="text-gray-600 mb-3">by {book.author}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">{book.genre}</span>
                    <span className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{book.readTime}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {book.downloads.toLocaleString()} downloads
                    </span>
                    <button 
                      onClick={() => handleAddTrendingBook(book)}
                      disabled={!!addBookStatus[`gutendex-${book.id}`]?.message && addBookStatus[`gutendex-${book.id}`]?.message !== 'Failed'}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
                    >
                      {addBookStatus[`gutendex-${book.id}`]?.message || 'Add to Library'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reading Goals View */}
        {activeView === 'goals' && (
          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Reading Journey</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Track your progress and discover books that align with your reading goals.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {mockReadingGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`w-12 h-12 ${goal.color} rounded-xl flex items-center justify-center text-2xl`}>
                      {goal.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{goal.title}</h3>
                      <p className="text-gray-600 text-sm">{goal.description}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{goal.progress}/{goal.target} books</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${goal.color}`}
                        style={{ width: `${(goal.progress / goal.target) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleFindRecommendedBooks(goal.title)}
                    className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Find Recommended Books
                  </button>
                </div>
              ))}
            </div>
            
            {/* Suggested Goals */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Suggested Reading Goals</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'World Literature Explorer', description: 'Read books from 5 different countries', icon: '🌍' },
                  { title: 'Time Traveler', description: 'Read books from 3 different centuries', icon: '⏰' },
                  { title: 'Genre Master', description: 'Complete 3 different genres', icon: '🎭' }
                ].map((suggestion, index) => (
                  <div 
                    key={index} 
                    onClick={() => handleAddReadingGoal(suggestion.title)}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                  >
                    <div className="text-2xl mb-2">{suggestion.icon}</div>
                    <h4 className="font-medium text-gray-900 mb-1">{suggestion.title}</h4>
                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
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
    </div>
  );
} 
