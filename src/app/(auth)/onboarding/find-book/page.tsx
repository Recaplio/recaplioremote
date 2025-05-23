import Link from 'next/link';

export default function FindBookPage() {
  return (
    <div className="min-h-[calc(100vh-150px)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white p-10 shadow-xl rounded-lg">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center">
          Find a Book from Project Gutenberg
        </h2>
        <form className="mt-8 space-y-6">
          <div>
            <label htmlFor="gutenberg-search" className="sr-only">
              Search Project Gutenberg
            </label>
            <input
              id="gutenberg-search"
              name="gutenberg-search"
              type="search"
              required
              className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search by title, author, or keyword..."
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Search (Placeholder)
            </button>
          </div>
        </form>

        {/* Placeholder for Search Results */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Results:</h3>
          <ul className="space-y-3">
            {[1, 2, 3].map(item => (
              <li key={item} className="bg-gray-50 p-3 rounded-md shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-semibold">Sample Book Title {item}</p>
                  <p className="text-sm text-gray-500">Author Name</p>
                </div>
                <button className="px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                  Add to Library
                </button>
              </li>
            ))}
            {!true && <p className="text-sm text-gray-500">No results found for your query.</p>}
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link href="/onboarding/upload-book"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Or, upload your own book
          </Link>
        </div>
         <div className="mt-4 text-center">
          <Link href="/onboarding/preferences" className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Skip to Next Step (Preferences)
          </Link>
        </div>
      </div>
    </div>
  );
} 