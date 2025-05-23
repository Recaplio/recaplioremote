import BookSearchDiscover from '../../components/BookSearchDiscover'; // Path from app/discover to components
import { createSupabaseServerClient } from '../../utils/supabase/server'; // Path from app/discover to utils
import { redirect } from 'next/navigation';

export default async function DiscoverPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // If you have a login page, redirect there.
    // For now, redirecting to a placeholder or home.
    // This ensures the discover page is only accessible by logged-in users.
    return redirect('/'); // Or your login page e.g., '/login'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Discover New Books</h1>
      <p className="mb-8 text-center text-gray-600">
        Search the Project Gutenberg catalog and add books to your library.
      </p>
      <BookSearchDiscover />
    </div>
  );
} 