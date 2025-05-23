import Link from 'next/link';

// Placeholder icons (simple SVGs)
const FlashcardIcon = () => <svg className="w-5 h-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm10 2H6v2h8V6zm0 3H6v2h8V9zm-3 3H6v2h5v-2z"/></svg>;
const ExportIcon = () => <svg className="w-5 h-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/></svg>;
const QuizIcon = () => <svg className="w-5 h-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.504l-1.414 2.828A1 1 0 008.867 11H11a1 1 0 00.867-.496l1.414-2.828A1 1 0 0012.133 7H12a1 1 0 00-1-1H9a1 1 0 100 2h.133A.997.997 0 0010 8.828V11a1 1 0 102 0V8.828a.997.997 0 00.867.172H11a1 1 0 100-2h-.133a1 1 0 00-.867-.504L8.586 4.668A3 3 0 006.133 4H6a1 1 0 00-1 1v.133a.996.996 0 000 .01L4.504 6.133A1 1 0 004 7.133V9a1 1 0 102 0V7.133A.996.996 0 006.01 6l.01-.496A1 1 0 007.133 4H9a1 1 0 000-2zm-2 7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd"/></svg>;
const RecapIcon = () => <svg className="w-5 h-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6c0 1.888.868 3.58 2.206 4.683A4.002 4.002 0 0110 18a4.002 4.002 0 015.794-3.317A5.969 5.969 0 0016 8a6 6 0 00-6-6zm0 14.5a2.5 2.5 0 000-5 2.5 2.5 0 000 5z"/></svg>;

// Updated props to match Next.js 15 async params pattern
export default async function StudyToolsPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params; // Must await params

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-gray-800">Study Tools</h1>
            <Link href={`/library/${bookId}`} className="text-sm text-indigo-600 hover:text-indigo-800">
                &larr; Back to Book Details
            </Link>
        </div>
        <p className="text-gray-600">Enhance your learning for Book ID: {bookId}</p>
      </div>

      <div className="space-y-6">
        {/* Flashcards Section */}
        <section className="p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center"><FlashcardIcon /> Flashcards</h2>
          <p className="text-gray-600 mb-4">Generate flashcards from your highlights and annotations to test your knowledge.</p>
          <button className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm transition-colors">
            Generate Flashcards from Highlights (Placeholder)
          </button>
           <p className="mt-2 text-xs text-gray-500">Requires Premium Plan</p>
        </section>

        {/* Export Section */}
        <section className="p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center"><ExportIcon /> Export Notes & Summaries</h2>
          <p className="text-gray-600 mb-4">Export your notes, highlights, and AI-generated summaries to your favorite note-taking apps or common file formats.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: "Notion", label: "Notion" },
              { key: "Markdown", label: "Markdown" },
              { key: "PDF", label: "Export to PDF" },
              { key: "DOC", label: "Export to .doc" }
            ].map((format) => (
              <button key={format.key} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md shadow-sm transition-colors">
                {format.label} (Placeholder)
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">Requires Premium Plan</p>
        </section>

        {/* Quiz Generator Section */}
        <section className="p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center"><QuizIcon /> Quiz Generator <span className="ml-2 text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded-full">Beta</span></h2>
          <p className="text-gray-600 mb-4">Test your understanding with an AI-generated quiz based on the book&apos;s content.</p>
          <button className="w-full sm:w-auto px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md shadow-sm transition-colors">
            Generate Quiz (Placeholder)
          </button>
        </section>

        {/* AI Recap Section */}
        <section className="p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center"><RecapIcon /> AI Recap</h2>
          <p className="text-gray-600 mb-4">Get a quick AI-powered summary of what you&apos;ve learned or highlighted so far in this book.</p>
          <button className="w-full sm:w-auto px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors">
            &quot;What have I learned so far?&quot; (Placeholder)
          </button>
        </section>
      </div>
    </div>
  );
} 