'use client';

import BookCard, { BookCardProps } from "../../components/library/BookCard";
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';

const dummyBooksData = [
  {
    id: "1",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    genre: "Fiction",
    readingProgress: 75,
    isPinned: true,
    coverImageUrl: "https://source.unsplash.com/random/400x600?book,classic"
  },
  {
    id: "2",
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    genre: "Non-fiction",
    readingProgress: 40,
    coverImageUrl: "https://source.unsplash.com/random/400x600?book,history",
    isPinned: false,
  },
  {
    id: "3",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    genre: "Fiction",
    readingProgress: 100,
    coverImageUrl: "https://source.unsplash.com/random/400x600?book,literature",
    isPinned: false,
  },
  {
    id: "4",
    title: "Atomic Habits",
    author: "James Clear",
    genre: "Self-help",
    readingProgress: 60,
    isPinned: true,
  },
  {
    id: "5",
    title: "1984",
    author: "George Orwell",
    genre: "Dystopian",
    readingProgress: 25,
    coverImageUrl: "https://source.unsplash.com/random/400x600?book,dystopian",
    isPinned: false,
  },
  {
    id: "6",
    title: "The Lean Startup",
    author: "Eric Ries",
    genre: "Business",
    readingProgress: 90,
    isPinned: false,
  },
];

const dummyBooks: BookCardProps[] = dummyBooksData.map(book => ({
    id: book.id,
    title: book.title,
    author: book.author,
    genre: book.genre,
    readingProgress: book.readingProgress,
    isPinned: book.isPinned,
    coverImageUrl: book.coverImageUrl,
  }));

export default function LibraryPage() {
  return (
    <ProtectedRoute>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">My Library</h1>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              All
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Fiction
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Non-Fiction
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Pinned
            </button>
            {/* Placeholder for Tags Dropdown */}
            <select className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <option>All Tags</option>
              <option>Classic</option>
              <option>Sci-Fi</option>
            </select>
          </div>
        </div>

        {dummyBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
            {dummyBooks.map((book) => (
              <BookCard key={book.id} {...book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Your Library is Empty</h2>
            <p className="text-gray-500 mb-4">Add books from Project Gutenberg or upload your own to get started.</p>
            {/* Add Link components here to discovery or upload page */}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
} 