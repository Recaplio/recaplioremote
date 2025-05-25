'use client';

import { ChangeEvent, FormEvent } from 'react';

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
    <form onSubmit={handleSearchSubmit} className="flex gap-2">
      <input
        type="search"
        value={searchTerm}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        placeholder="Search by title, author, or topic..."
        className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base font-medium"
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
} 