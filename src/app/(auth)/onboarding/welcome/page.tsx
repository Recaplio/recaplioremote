import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="min-h-[calc(100vh-150px)] flex flex-col items-center justify-center text-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white p-10 shadow-xl rounded-lg">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Welcome to Recaplio!
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Let&apos;s get your reading journey started. First, add a book to your library.
        </p>
        <div className="space-y-4 md:space-y-0 md:flex md:justify-center md:space-x-4">
          <Link href="/onboarding/upload-book"
            className="block w-full md:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Upload a Book (PDF/EPUB)
          </Link>
          <Link href="/onboarding/find-book"
            className="block w-full md:w-auto px-6 py-3 border border-indigo-600 text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Search Project Gutenberg
          </Link>
        </div>
        <p className="mt-10 text-sm text-gray-500">
          You can also skip this for now and set up your preferences, or go directly to your dashboard.
        </p>
        <div className="mt-4 flex justify-center space-x-4">
            <Link href="/onboarding/preferences" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Set Preferences
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Go to Dashboard
            </Link>
        </div>
      </div>
    </div>
  );
} 