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
    <form onSubmit={handleSearchSubmit} className="flex gap-3">
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="search"
          value={searchTerm}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          placeholder="Search by title, author, or topic..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-sm transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-opacity-20 hover:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !searchTerm.trim()}
        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-brand-500 to-secondary-500 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:from-brand-600 hover:to-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 disabled:transform-none"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Searching...
          </>
        ) : (
          <>
            <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
            Search
          </>
        )}
      </button>
    </form>
  );
} 