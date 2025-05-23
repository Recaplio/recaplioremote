import Link from 'next/link';

export default function UploadBookPage() {
  return (
    <div className="min-h-[calc(100vh-150px)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white p-10 shadow-xl rounded-lg text-center">
        <h2 className="text-3xl font-extrabold text-gray-900">
          Upload Your Book
        </h2>
        <p className="text-gray-600">
          Add a PDF or EPUB file to your Recaplio library.
        </p>
        <form className="mt-8 space-y-6">
          <div>
            <label htmlFor="book-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Select a file (PDF or EPUB):
            </label>
            <input
              id="book-upload"
              name="book-upload"
              type="file"
              accept=".pdf,.epub"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Upload and Process Book (Placeholder)
            </button>
          </div>
        </form>
        <div className="mt-6">
          <Link href="/onboarding/find-book"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Or, search Project Gutenberg instead
          </Link>
        </div>
        <div className="mt-4">
          <Link href="/onboarding/preferences" className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Skip to Next Step (Preferences)
          </Link>
        </div>
      </div>
    </div>
  );
} 