export default function DiscoverPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Discover Public Books</h1>
      <p className="mb-4">Search and add books from Project Gutenberg to your library.</p>
      
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Search by title, author, genre, themes, ideas..." 
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Placeholder for search results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="bg-white shadow-lg rounded-lg p-4">
            <div className="h-40 bg-gray-200 rounded-md mb-3"></div> {/* Placeholder for book cover */}
            <h2 className="text-lg font-semibold mb-1">Public Book Title {item}</h2>
            <p className="text-sm text-gray-600 mb-2">Author Name</p>
            <p className="text-xs text-gray-500 mb-3">Genre: Classic</p>
            <button className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600">
              Add to Library
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 