import { createSupabaseServerClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { BookCheck, BarChart3, Zap, CalendarClock, Brain } from 'lucide-react'; // Example icons

interface BookDetailsPageParams {
  userBookId: string;
}

interface AuthorData {
  name: string;
  birth_year?: number; // Made more specific
  death_year?: number; // Made more specific
}

interface PublicBookData {
  id: number;
  title: string;
  authors: AuthorData[] | null;
  gutenberg_id: number | null;
  description?: string; // Assuming description might be in public_books
  cover_image_url?: string; 
}

// Mock function to get chapter data - replace with actual fetching if available
const getChaptersPlaceholder = (bookId: number | undefined) => {
  if (!bookId) return [];
  return [
    { id: 1, title: "Chapter 1: Moving West", number: 1 },
    { id: 2, title: "Chapter 2: The Valley of Ashes", number: 2 },
    { id: 3, title: "Chapter 3: Gatsby's Party", number: 3 },
  ].slice(0, Math.floor(Math.random() * 3) + 1);
};

interface UserBookQueryResult {
    id: number;
    user_id: string;
    reading_progress_percent: number | null;
    public_book_db_id: number;
    public_books: PublicBookData | PublicBookData[] | null; // Adjusted to reflect potential array from Supabase
}

export default async function BookDetailsPage({ params: rawParams }: { params: Promise<BookDetailsPageParams> }) {
  const params = await rawParams; // Ensure params are resolved from the promise
  console.log(`[BookDetailsPage] Rendering for userBookId (param): ${params.userBookId}`);
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('[BookDetailsPage] No user found, redirecting to login.');
    redirect(`/login?message=Please log in to view book details.&redirectTo=/library/${params.userBookId}`);
  }
  console.log(`[BookDetailsPage] Authenticated user: ${user.id}`);

  const userBookIdNum = parseInt(params.userBookId, 10);
  console.log(`[BookDetailsPage] Parsed userBookIdNum: ${userBookIdNum}`);

  if (isNaN(userBookIdNum)) {
    console.log('[BookDetailsPage] userBookIdNum is NaN, returning notFound.');
    notFound();
  }

  const { data: userBookData, error: userBookError } = await supabase
    .from("user_books")
    .select(`
      id,
      user_id,
      reading_progress_percent,
      public_book_db_id,
      public_books!inner (
        id,
        title,
        authors,
        gutenberg_id,
        cover_image_url
      )
    `)
    .eq("id", userBookIdNum)
    .eq("user_id", user.id)
    .single<UserBookQueryResult>();

  console.log('[BookDetailsPage] Fetched userBookData:', JSON.stringify(userBookData, null, 2));
  if (userBookError) {
    console.error('[BookDetailsPage] Supabase error fetching userBookData:', userBookError);
  }

  if (userBookError || !userBookData) {
    console.error(`[BookDetailsPage] Not found or error for user book ${userBookIdNum}. Error: ${userBookError?.message}`);
    notFound();
  }

  let book: PublicBookData | null = null;
  if (Array.isArray(userBookData.public_books) && userBookData.public_books.length > 0) {
    book = userBookData.public_books[0] as PublicBookData;
    console.log("[BookDetailsPage] Derived 'book' from public_books array (first element).");
  } else if (userBookData.public_books && typeof userBookData.public_books === 'object' && !Array.isArray(userBookData.public_books)) {
    // This case handles when Supabase, due to !inner and .single(), correctly infers it as an object.
    book = userBookData.public_books as PublicBookData;
    console.log("[BookDetailsPage] Derived 'book' from public_books object.");
  } else {
    console.log('[BookDetailsPage] public_books is in an unexpected format, empty, or null:', JSON.stringify(userBookData.public_books, null, 2));
  }
  console.log("[BookDetailsPage] Final 'book' object:", JSON.stringify(book, null, 2));

  if (!book) {
    console.error("[BookDetailsPage] Critical error: 'book' is null after attempting to derive from public_books.");
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Displaying Book Details</h1>
            <p className="text-gray-700 mb-2">Essential book information is missing. Please try again later.</p>
            <Link href="/library" className="text-indigo-600 hover:underline">Return to Library</Link>
        </div>
    );
  }

  const reading_progress_percent = userBookData.reading_progress_percent;
  const chapters = getChaptersPlaceholder(book?.id);
  const notesCount = 5; 
  const highlightsCount = 12; 
  const genre = "Fiction"; // Reverted to placeholder as subjects column is not available

  console.log("[BookDetailsPage] Data for rendering:", {
    title: book?.title,
    author: book?.authors?.map(a => a.name).join(", "),
    coverUrl: book?.cover_image_url,
    progress: reading_progress_percent,
    genre: genre,
    bookId: params.userBookId
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/library" className="text-indigo-600 hover:text-indigo-800 mb-6 inline-block">
          &larr; Back to Library
        </Link>

        <div className="bg-white shadow-xl rounded-lg md:flex">
          {/* Left Column: Cover & Basic Info */} 
          <div className="md:w-1/3 p-6 flex flex-col items-center md:items-start">
            {book.cover_image_url ? (
              <Image 
                src={book.cover_image_url} 
                alt={`Cover of ${book.title || 'Book'}`} 
                width={300} 
                height={450} 
                className="rounded-md shadow-md object-cover mb-4 w-full max-w-xs md:max-w-full"
              />
            ) : (
              <div className="w-full max-w-xs md:max-w-full h-72 bg-gray-200 flex items-center justify-center rounded-md shadow-md mb-4">
                <BookCheck className="w-20 h-20 text-gray-400" />
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center md:text-left">{book.title || 'Untitled Book'}</h1>
            <p className="text-md text-gray-600 text-center md:text-left">
              by {book.authors?.map((a: AuthorData) => a.name).join(", ") || "Unknown Author"}
            </p>
            <p className="text-sm text-gray-500 mt-1 text-center md:text-left">Genre: {genre}</p>
            <p className="text-sm text-gray-500 mt-1 text-center md:text-left">
                Progress: {reading_progress_percent || 0}% (User Book ID: {params.userBookId})
            </p>
            <Link 
              href={`/reader/${params.userBookId}`}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-md text-center transition duration-150 ease-in-out shadow-md"
            >
              Continue Reading
            </Link>
          </div>

          {/* Right Column: Tools, Description, Chapters */} 
          <div className="md:w-2/3 p-6 md:pl-8">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">Book Tools & Info</h2>
              <div className="space-y-2">
                {[ // Placeholder tools
                  { name: "View Summaries (Placeholder)", icon: <BarChart3 size={20} className="mr-2 text-indigo-500"/> },
                  { name: "Access Concept Map", icon: <Brain size={20} className="mr-2 text-teal-500"/> },
                  { name: "Timeline / Flow Mode", icon: <CalendarClock size={20} className="mr-2 text-purple-500"/>, pro: true },
                  { name: "Study Tools", icon: <Zap size={20} className="mr-2 text-amber-500"/> },
                ].map(tool => (
                  <button key={tool.name} className="w-full flex items-center text-left bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-md transition duration-150">
                    {tool.icon} {tool.name} {tool.pro && <span className="ml-auto text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Pro</span>}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-sm text-gray-600">
                <span>Notes: {notesCount}</span>
                <span>Highlights: {highlightsCount}</span>
              </div>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed">
                Description is currently unavailable.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-3">Chapters (Placeholder)</h2>
              {chapters.length > 0 ? (
                <ul className="space-y-2">
                  {chapters.map(chapter => (
                    <li key={chapter.id} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition duration-150">
                      <Link href={`/reader/${params.userBookId}?chapter=${chapter.number}`} className="text-indigo-600 hover:text-indigo-800 block">
                        Chapter {chapter.number}: {chapter.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">Chapter information is not yet available.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 