import Link from 'next/link';

export default function PreferencesPage() {
  return (
    <div className="min-h-[calc(100vh-150px)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-white p-10 shadow-xl rounded-lg">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center">
          Set Your Reading Preferences
        </h2>
        <p className="text-gray-600 text-center">
          This helps Recaplio tailor the AI assistant to your reading style.
        </p>
        <form className="mt-8 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Default Reading Mode:</h3>
            <fieldset className="mt-2">
              <legend className="sr-only">Reading mode</legend>
              <div className="space-y-2 sm:flex sm:items-center sm:space-y-0 sm:space-x-4">
                <div className="flex items-center">
                  <input
                    id="fiction-mode"
                    name="reading-mode"
                    type="radio"
                    defaultChecked
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                  <label htmlFor="fiction-mode" className="ml-2 block text-sm font-medium text-gray-700">
                    Fiction
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="non-fiction-mode"
                    name="reading-mode"
                    type="radio"
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                  <label htmlFor="non-fiction-mode" className="ml-2 block text-sm font-medium text-gray-700">
                    Non-Fiction
                  </label>
                </div>
              </div>
            </fieldset>
          </div>
          
          {/* Placeholder for other preferences if any */}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-6"
            >
              Save Preferences & Go to Dashboard (Placeholder)
            </button>
          </div>
        </form>
        <div className="mt-6 text-center">
          <Link href="/"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Skip and Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 