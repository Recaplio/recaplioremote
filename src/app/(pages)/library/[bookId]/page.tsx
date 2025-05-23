import Link from 'next/link';
import Image from 'next/image';

// type BookDetailPageProps = {
//   params: {
//     bookId: string;
//   };
// };

// Dummy data - in a real app, you'd fetch this based on params.bookId
const dummyBookDetails = {
  id: "1",
  title: "The Great Gatsby",
  author: "F. Scott Fitzgerald",
  genre: "Fiction",
  description: "The Great Gatsby is a 1925 novel by American writer F. Scott Fitzgerald. Set in the Jazz Age on Long Island, near New York City, the novel depicts first-person narrator Nick Carraway\'s interactions with mysterious millionaire Jay Gatsby and Gatsby\'s obsession to reunite with his former lover, Daisy Buchanan.",
  coverImageUrl: "https://source.unsplash.com/random/400x600?book,classic", // "https://images-na.ssl-images-amazon.com/images/I/81QuEGw8VPL.jpg",
  chapters: ["Chapter 1: Moving West", "Chapter 2: The Valley of Ashes", "Chapter 3: Gatsby's Party", "Chapter 4: The Green Light", "Chapter 5: Tea with Daisy"],
  userProgress: 75, // percentage
  notesCount: 5,
  highlightsCount: 12,
};

// A simple Book Icon for placeholder
const BookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm8 14H8v-2h4v2zm4-4H4V4h12v8z" clipRule="evenodd" />
  </svg>
);

// Updated props to match Next.js 15 async params pattern
export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params; // Must await params
  // Use resolved bookId to fetch or reference data
  const book = { ...dummyBookDetails, id: bookId }; // In real app: await fetchBookDetails(bookId);

  if (!book) {
    return <p className="text-center text-gray-600 py-10">Book not found.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-0">
      {/* Back to Library Link - positioned at the top for mobile, could be moved based on UX preference */}
      <div className="mb-6">
        <Link href="/library" className="text-indigo-600 hover:text-indigo-800 transition-colors duration-150">
          &larr; Back to Library
        </Link>
      </div>

      <div className="md:flex md:space-x-8 mb-10">
        <div className="md:w-1/3 mb-6 md:mb-0 flex-shrink-0">
          {book.coverImageUrl ? (
            <Image src={book.coverImageUrl} alt={`Cover of ${book.title}`} width={400} height={600} className="w-full h-auto object-cover rounded-lg shadow-xl aspect-[2/3]" />
          ) : (
            <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center rounded-lg shadow-lg">
              <BookIcon className="w-20 h-20 text-gray-400" />
            </div>
          )}
        </div>
        <div className="md:w-2/3">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 leading-tight">{book.title}</h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-1">by {book.author}</p>
          <p className="text-sm text-gray-500 mb-1 capitalize">Genre: {book.genre}</p>
          <p className="text-sm text-gray-500 mb-5">Progress: {book.userProgress}% (Book ID: {bookId})</p>
          
          <Link href={`/reader/${bookId}`}
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 text-lg mb-6 w-full sm:w-auto text-center"
          >
            Continue Reading
          </Link>
          
          <div className="space-y-3 border-t pt-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Book Tools & Info</h2>
            <ActionLink href="#" label="View Summaries (Placeholder)" />
            <ActionLink href={`/library/${bookId}/concept-map`} label="Access Concept Map" />
            <ActionLink href={`/library/${bookId}/timeline`} label="Timeline / Flow Mode" isPro />
            <ActionLink href={`/library/${bookId}/study`} label="Study Tools" />
            <p className="text-sm text-gray-600 pt-2">Notes: <span className="font-medium">{book.notesCount}</span></p>
            <p className="text-sm text-gray-600">Highlights: <span className="font-medium">{book.highlightsCount}</span></p>
          </div>
        </div>
      </div>

      <div className="border-t pt-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Description</h2>
        <div className="prose max-w-none text-gray-700 leading-relaxed mb-8">
          <p>{book.description}</p>
        </div>

        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Chapters (Placeholder)</h2>
        <ul className="space-y-2">
          {book.chapters.map(chapter => 
            <li key={chapter} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors text-gray-700">
              {chapter}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
} 

// Helper component for action links for consistency
interface ActionLinkProps {
  href: string;
  label: string;
  isPro?: boolean;
  isBeta?: boolean; // Could add beta later
}
const ActionLink = ({ href, label, isPro }: ActionLinkProps) => (
  <Link href={href} passHref>
    <button className="w-full text-left p-3 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors duration-150 flex justify-between items-center shadow-sm hover:shadow-md">
      <span>{label}</span>
      {isPro && <span className="text-xs font-semibold bg-purple-200 text-purple-700 px-2.5 py-1 rounded-full">Pro</span>}
    </button>
  </Link>
); 