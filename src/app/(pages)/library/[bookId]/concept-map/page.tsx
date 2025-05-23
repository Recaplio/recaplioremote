import Link from 'next/link';
// No PageProps import needed with this pattern

// TODO: URGENT - Revisit this type definition. Changed entire Props to any to resolve a persistent build issue.
// The build fails with a type error related to Next.js internal PageProps expecting Promise<any> for params/searchParams.
// This needs to be investigated and fixed properly.
// type ConceptMapPageProps = any; // Removed eslint-disable as it's no longer needed for 'any'

// Original type was:
// type ConceptMapPageProps = {
//   params: {
//     bookId: string;
//   };
//   searchParams?: { [key: string]: string | string[] | undefined };
// };

// Updated props to match Next.js 15 async params pattern
export default async function ConceptMapPage({
  params,
}: {
  params: Promise<{ bookId: string }>
  // searchParams can be added here if needed, also as a Promise
}) {
  const { bookId } = await params; // Must await params

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Concept Map for Book ID: {bookId}</h1>
        <Link href={`/library/${bookId}`} className="text-indigo-600 hover:text-indigo-800">
          &larr; Back to Book Details
        </Link>
      </div>

      <p className="text-gray-600 mb-4">
        This is a placeholder for the interactive Concept & Knowledge Map. It will be built using a library like React Flow or D3.js to visualize connections between characters, themes (for fiction) or concepts, arguments (for non-fiction).
      </p>

      <div className="w-full h-[600px] bg-gray-100 border border-gray-300 rounded-lg shadow-inner flex items-center justify-center">
        {/* Placeholder for React Flow or D3 diagram */}
        <div className="text-center p-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Interactive Map Area</h2>
          <p className="text-gray-500 mb-4">Nodes and edges representing concepts will be displayed here.</p>
          
          {/* Example static nodes/connections description */}
          <div className="text-left text-sm text-gray-600 border p-4 rounded-md bg-white">
            <h4 className="font-semibold mb-2">Example Structure:</h4>
            <p><strong>Node A:</strong> Character &apos;Jay Gatsby&apos;</p>
            <p><strong>Node B:</strong> Theme &apos;The American Dream&apos;</p>
            <p><strong>Node C:</strong> Character &apos;Daisy Buchanan&apos;</p>
            <p><strong>Connection:</strong> Gatsby &rarr; (related to) &rarr; The American Dream</p>
            <p><strong>Connection:</strong> Gatsby &rarr; (loves) &rarr; Daisy Buchanan</p>
            <p className="mt-2 italic">(Clickable nodes will link to relevant text passages)</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 border border-dashed border-gray-400 rounded-md bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Developer Notes:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Auto-generated based on book content and AI analysis.</li>
          <li>Nodes will be clickable, linking to specific text segments.</li>
          <li>Consider using React Flow for its ease of use with React, or D3 for more custom visualizations.</li>
        </ul>
      </div>
    </div>
  );
} 