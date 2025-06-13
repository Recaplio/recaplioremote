'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import FlashcardsManager from '@/components/study-tools/FlashcardsManager';

interface UserBook {
  id: number;
  title: string;
  author: string;
  reading_mode: 'fiction' | 'non-fiction';
}

type UserTier = 'FREE' | 'PREMIUM' | 'PRO';

export default function StudyToolsPage() {
  const params = useParams();
  const router = useRouter();
  const userBookId = params?.userBookId as string;
  const [userBook, setUserBook] = useState<UserBook | null>(null);
  const [userTier, setUserTier] = useState<UserTier>('FREE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserTier = async (): Promise<UserTier> => {
    try {
      const response = await fetch('/api/user/tier');
      if (!response.ok) {
        throw new Error('Failed to fetch user tier');
      }
      const data = await response.json();
      return data.tier || 'FREE';
    } catch (error) {
      console.error('Error fetching user tier:', error);
      return 'FREE';
    }
  };

  const fetchBookAndTier = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch user tier
      const tier = await fetchUserTier();
      setUserTier(tier);

      // Fetch book details
      const response = await fetch(`/api/user-library/${userBookId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch book details');
      }

      const data = await response.json();
      setUserBook({
        id: data.id,
        title: data.public_books?.title || 'Unknown Title',
        author: data.public_books?.authors?.map((a: { name: string }) => a.name).join(', ') || 'Unknown Author',
        reading_mode: data.reading_mode || 'fiction'
      });

    } catch (err) {
      console.error('Error fetching book details:', err);
      setError('Failed to load book details');
    } finally {
      setLoading(false);
    }
  }, [userBookId]);

  useEffect(() => {
    if (!userBookId) {
      router.push('/library');
      return;
    }

    fetchBookAndTier();
  }, [userBookId, fetchBookAndTier, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading study tools...</p>
        </div>
      </div>
    );
  }

  if (error || !userBook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{error || 'Book not found'}</p>
          <Link 
            href="/library" 
            className="text-indigo-600 hover:text-indigo-800 underline"
          >
            Return to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/library/${userBookId}`}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Book Details
          </Link>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Tools</h1>
            <h2 className="text-xl text-gray-700 mb-1">{userBook.title}</h2>
            <p className="text-gray-600">by {userBook.author}</p>
            <div className="mt-4 flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {userBook.reading_mode}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                userTier === 'PRO' ? 'bg-purple-100 text-purple-800' :
                userTier === 'PREMIUM' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {userTier} Plan
              </span>
            </div>
          </div>
        </div>

        {/* Study Tools Content */}
        <div className="space-y-8">
          {/* Flashcards Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Flashcards</h3>
              <p className="text-gray-600">
                Create and review flashcards from your highlights and notes.
              </p>
              {userTier !== 'PRO' && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <p className="text-sm text-purple-700">
                    <strong>Pro Feature:</strong> Upgrade to Pro to create and manage flashcards.
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6">
              <FlashcardsManager 
                userBookId={parseInt(userBookId, 10)}
                bookTitle={userBook.title}
                userTier={userTier}
              />
            </div>
          </div>

          {/* AI Recap Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Reading Recap</h3>
              <p className="text-gray-600">
                Get AI-generated summaries of your reading progress and key insights.
              </p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
                  <h4 className="font-medium text-gray-900 mb-2">Progress Recap</h4>
                  <p className="text-sm text-gray-600">Summary of what you&apos;ve read so far</p>
                </button>
                
                <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
                  <h4 className="font-medium text-gray-900 mb-2">Chapter Recap</h4>
                  <p className="text-sm text-gray-600">Detailed summary of specific chapters</p>
                </button>
                
                <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
                  <h4 className="font-medium text-gray-900 mb-2">Full Book Recap</h4>
                  <p className="text-sm text-gray-600">Complete overview of the entire book</p>
                </button>
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Export Notes & Highlights</h3>
              <p className="text-gray-600">
                Export your annotations, highlights, and study materials.
              </p>
              {userTier !== 'PRO' && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <p className="text-sm text-purple-700">
                    <strong>Pro Feature:</strong> Upgrade to Pro to export your study materials.
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Notion', 'Markdown', 'PDF', 'Word'].map((format) => (
                  <button 
                    key={format}
                    disabled={userTier !== 'PRO'}
                    className={`p-3 border rounded-lg text-center ${
                      userTier === 'PRO' 
                        ? 'border-gray-300 hover:bg-gray-50 text-gray-900' 
                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="font-medium">{format}</div>
                    <div className="text-xs text-gray-500 mt-1">Export to {format}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quiz Generator Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Quiz Generator 
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Beta
                </span>
              </h3>
              <p className="text-gray-600">
                Generate custom quizzes to test your understanding of the book.
              </p>
              {userTier !== 'PRO' && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <p className="text-sm text-purple-700">
                    <strong>Pro Feature:</strong> Upgrade to Pro to generate custom quizzes.
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  disabled={userTier !== 'PRO'}
                  className={`p-4 border rounded-lg text-left ${
                    userTier === 'PRO' 
                      ? 'border-gray-300 hover:bg-gray-50 text-gray-900' 
                      : 'border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <h4 className="font-medium mb-2">Multiple Choice Quiz</h4>
                  <p className="text-sm text-gray-600">Test comprehension with multiple choice questions</p>
                </button>
                
                <button 
                  disabled={userTier !== 'PRO'}
                  className={`p-4 border rounded-lg text-left ${
                    userTier === 'PRO' 
                      ? 'border-gray-300 hover:bg-gray-50 text-gray-900' 
                      : 'border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <h4 className="font-medium mb-2">Mixed Format Quiz</h4>
                  <p className="text-sm text-gray-600">Combination of question types for comprehensive testing</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 