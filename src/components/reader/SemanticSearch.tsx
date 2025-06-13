'use client';

import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchResult {
  chunkIndex: number;
  content: string;
  similarity: number;
  preview: string;
}

interface SemanticSearchProps {
  bookId: number;
  onSectionSelect: (sectionIndex: number) => void;
}

export default function SemanticSearch({ bookId, onSectionSelect }: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async () => {
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          bookId,
          limit: 8,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
      setShowResults(true);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
    if (e.key === 'Escape') {
      setShowResults(false);
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (sectionIndex: number) => {
    onSectionSelect(sectionIndex);
    setShowResults(false);
    setQuery('');
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setError(null);
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'text-green-600';
    if (similarity >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search within this book (themes, characters, concepts)..."
          className="w-full p-2 pl-8 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          disabled={isSearching}
        />
        
        {/* Search Icon */}
        <MagnifyingGlassIcon 
          className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
          onClick={performSearch}
        />
        
        {/* Clear Button */}
        {query && (
          <XMarkIcon 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
            onClick={clearSearch}
          />
        )}
        
        {/* Loading Indicator */}
        {isSearching && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm z-50">
          {error}
        </div>
      )}

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-600 font-medium">
              Found {results.length} relevant passages
            </span>
          </div>
          
          {results.map((result, index) => (
            <div
              key={index}
              onClick={() => handleResultClick(result.chunkIndex)}
              className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-medium text-brand-600">
                  Section {result.chunkIndex + 1}
                </span>
                <span className={`text-xs font-medium ${getSimilarityColor(result.similarity)}`}>
                  {Math.round(result.similarity * 100)}% match
                </span>
              </div>
              
              <p className="text-sm text-gray-700 line-clamp-3">
                {result.preview}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && results.length === 0 && !isSearching && !error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-4 bg-white border border-gray-200 rounded-md shadow-lg text-center z-50">
          <p className="text-sm text-gray-500">No relevant passages found for &quot;{query}&quot;</p>
          <p className="text-xs text-gray-400 mt-1">Try different keywords or phrases</p>
        </div>
      )}
    </div>
  );
} 