export interface Book {
  id: string;
  title: string;
  author: string;
  genre?: string; // Optional as not all books might have it immediately
  coverImageUrl?: string;
  readingProgress: number; // Percentage from 0 to 100
  status: 'unread' | 'reading' | 'finished';
  isPinned: boolean;
  filePath: string; // Path to the book file (e.g., EPUB, PDF)
  summary?: string; // Optional AI-generated or user-added summary
  // Add any other relevant fields, e.g.:
  // totalPages?: number;
  // currentPage?: number;
  // addedDate?: string; // ISO date string
  // lastReadDate?: string; // ISO date string
  // highlightsCount?: number;
  // notesCount?: number;
} 