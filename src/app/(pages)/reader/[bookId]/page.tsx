// Using Heroicons (https://heroicons.com/) as SVGs for placeholders
// You might want to install a library like lucide-react or heroicons for better icon management
'use client'; // For dummy state and potentially future interactions
import { useState } from 'react';
import { useParams } from 'next/navigation'; // Import useParams

const BookmarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.5 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  </svg>
);

const HighlightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
);

const AnnotationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

// Type for params from useParams hook
type PageParams = {
  bookId: string;
};

export default function BookReaderPage() {
  const params = useParams<PageParams>(); // Use the hook to get route parameters
  const bookId = params.bookId; // Extract bookId, this should now be safe

  const [readingProgress, setReadingProgress] = useState(65);
  const [currentMode, setCurrentMode] = useState<"Fiction" | "Non-Fiction">("Fiction");

  return (
    // Use flex-grow to fill available space from parent (main layout)
    // Min height for reader content can be useful on mobile if AI panel is very short
    <div className="flex flex-col md:flex-row flex-grow bg-gray-50 overflow-hidden">
      {/* Left Pane: Scrollable Reader */}
      <div className="w-full md:w-2/3 border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Reader Controls Header */}
        <div className="p-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-2">
            <h1 className="text-xl font-semibold text-gray-800 order-1 sm:order-none truncate mr-2">Book Title (ID: {bookId})</h1>
            <div className="flex items-center space-x-1 sm:space-x-2 order-2 sm:order-none flex-shrink-0">
              <button title="Highlight" className="p-1.5 sm:p-2 rounded-md hover:bg-yellow-100 text-gray-600 hover:text-yellow-600"><HighlightIcon /></button>
              <button title="Add Bookmark" className="p-1.5 sm:p-2 rounded-md hover:bg-blue-100 text-gray-600 hover:text-blue-600"><BookmarkIcon /></button>
              <button title="Annotate" className="p-1.5 sm:p-2 rounded-md hover:bg-green-100 text-gray-600 hover:text-green-600"><AnnotationIcon /></button>
            </div>
          </div>
          {/* Chapter Nav and Progress */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-2">
            <div className="flex items-center space-x-2">
              <button className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors">Prev</button>
              <select defaultValue="Chapter 2" className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-indigo-500 focus:border-indigo-500 max-w-[150px] sm:max-w-xs truncate">
                <option>Chapter 1: The Beginning of a Very Long Chapter Title Indeed</option>
                <option value="Chapter 2">Chapter 2: The Journey Continues On This Path</option>
                <option>Chapter 3: The Climax and The Final End</option>
              </select>
              <button className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors">Next</button>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[180px]">
              <input type="range" min="0" max="100" value={readingProgress} onChange={(e) => setReadingProgress(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              <p className="text-xs text-gray-500 text-right mt-1">{readingProgress}%</p>
            </div>
          </div>
          {/* In-Book Semantic Search Input */}
          <div className="mt-1">
            <input 
              type="search" 
              placeholder="Semantic search in book (e.g., themes, characters)..." 
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-white prose prose-sm sm:prose-base lg:prose-lg max-w-none">
          <h2 className="text-xl font-semibold mb-2">Current Chapter: Chapter 2: The Journey Continues On This Path</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
          <p>Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?</p>
          {/* More content paragraphs... */}
        </div>
      </div>

      {/* Right Pane: AI Assistant */}
      {/* On mobile (md:hidden effectively), this will be below. Ensure it does not cause overflow or become unusable. */}
      {/* md:h-full makes sure on desktop it tries to match the left pane if content is short, overflow-y-auto for its own content */}
      <div className="w-full md:w-1/3 p-3 sm:p-4 flex flex-col bg-white border-t md:border-t-0 md:border-l border-gray-200 md:h-full overflow-hidden">
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
            <div className="flex items-center space-x-1 border border-gray-300 rounded-full p-0.5 text-xs flex-shrink-0">
                <button onClick={() => setCurrentMode('Fiction')} className={`px-2.5 sm:px-3 py-1 rounded-full ${currentMode === 'Fiction' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'} transition-all`}>Fiction</button>
                <button onClick={() => setCurrentMode('Non-Fiction')} className={`px-2.5 sm:px-3 py-1 rounded-full ${currentMode === 'Non-Fiction' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'} transition-all`}>Non-Fiction</button>
            </div>
        </div>
        <div className="flex-grow bg-gray-50 p-2 sm:p-3 rounded-md overflow-y-auto mb-3 text-sm space-y-3 min-h-[200px] md:min-h-0">
          {/* Placeholder for chat messages */}
          <div className="p-2 rounded-md bg-indigo-50 text-indigo-800 self-start max-w-[85%]">
            <span className="font-semibold block">AI:</span> Hello! How can I help you with &quot;Book Title&quot; today while in {currentMode} mode?
          </div>
          <div className="p-2 rounded-md bg-gray-200 text-gray-800 self-end ml-auto max-w-[85%]">
            <span className="font-semibold block text-right">You:</span> Summarize this chapter for me.
          </div>
           <div className="p-2 rounded-md bg-indigo-50 text-indigo-800 self-start max-w-[85%]">
            <span className="font-semibold block">AI:</span> Certainly! This chapter focuses on... (placeholder summary for {currentMode} mode).
          </div>
        </div>
        <div className="mt-auto flex-shrink-0">
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md mb-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            rows={3}
            placeholder={`Ask about ${currentMode.toLowerCase()} aspects...`}
          ></textarea>
          <button className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
            Send
          </button>
        </div>
      </div>
    </div>
  );
} 