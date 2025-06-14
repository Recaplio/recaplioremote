'use client';

import { ChangeEvent, FormEvent } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchFormProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  handleSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export default function SearchForm({
  searchTerm,
  setSearchTerm,
  handleSearchSubmit,
  isLoading,
}: SearchFormProps) {
  return (
    <form onSubmit={handleSearchSubmit} className="flex gap-4 w-full max-w-4xl mx-auto">
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-6 w-6 text-white/60" aria-hidden="true" />
        </div>
        <input
          type="search"
          value={searchTerm}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          placeholder="Search by title, author, or topic..."
          className="block w-full pl-12 pr-4 py-4 text-lg bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/70 shadow-lg transition-all duration-300 focus:border-white/40 focus:outline-none focus:ring-4 focus:ring-white/20 focus:bg-white/20 hover:border-white/30 hover:bg-white/15 disabled:bg-white/5 disabled:text-white/50"
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !searchTerm.trim()}
        className="inline-flex items-center justify-center px-8 py-4 bg-white text-indigo-600 font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:hover:bg-white"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-3" />
            Searching...
          </>
        ) : (
          <>
            <MagnifyingGlassIcon className="w-5 h-5 mr-3" />
            Search Books
          </>
        )}
      </button>
    </form>
  );
} 