import { Suspense } from 'react';
import DiscoverClientPage from './DiscoverClientPage';

// Optional: Add a loading fallback for Suspense
function DiscoverLoading() {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <p className="text-lg text-gray-600">Loading discovery page...</p>
      {/* You can add a spinner or a more sophisticated skeleton loader here */}
    </div>
  );
}

export default function DiscoverPageContainer() {
  // Note: Any server-side auth checks (like createSupabaseServerClient) would go here
  // if you needed to protect the route at the server level before rendering the client part.
  // For example:
  // const supabase = createSupabaseServerClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) { redirect('/'); } // Or your login page

  return (
    <Suspense fallback={<DiscoverLoading />}>
      <DiscoverClientPage />
    </Suspense>
  );
} 