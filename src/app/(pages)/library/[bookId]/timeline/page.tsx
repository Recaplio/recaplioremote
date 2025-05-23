import Link from 'next/link';

// Updated props to match Next.js 15 async params pattern
export default async function TimelinePage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params; // Must await params

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Timeline / Flow Mode</h1>
          <span className="text-sm font-semibold bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">Pro Feature</span>
        </div>
        <Link href={`/library/${bookId}`} className="text-indigo-600 hover:text-indigo-800">
          &larr; Back to Book Details
        </Link>
      </div>
      <p className="text-gray-600 mb-2">
        Visualizing the book (ID: {bookId}) through time or logical flow.
      </p>
      <p className="text-gray-600 mb-4">
        This is a placeholder for the interactive Timeline (for fiction plots) or Argument Flow (for non-fiction). It will be a zoomable and interactive visualization.
      </p>

      <div className="w-full h-[600px] bg-gray-100 border border-gray-300 rounded-lg shadow-inner flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Interactive Timeline / Flow Area</h2>
        <p className="text-gray-500 mb-4 text-center">A visual representation of the plot points or argument structure will appear here. <br/> Users will be able to zoom and pan, and trace the development of ideas or plotlines.</p>
        
        {/* Example static timeline/flow description */}
        <div className="text-left text-sm text-gray-600 border p-4 rounded-md bg-white w-full max-w-md">
          <h4 className="font-semibold mb-2">Example: Plot Timeline (Fiction)</h4>
          <div className="relative border-l-2 border-indigo-500 pl-4 space-y-4">
            <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1"></div>
            <p><strong>Event 1:</strong> Introduction of main characters.</p>
            <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-10"></div>
            <p><strong>Event 2:</strong> Inciting incident occurs.</p>
            <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-20"></div>
            <p><strong>Event 3:</strong> Rising action, subplots develop...</p>
          </div>
          <h4 className="font-semibold mb-2 mt-4">Example: Argument Flow (Non-Fiction)</h4>
          <p>Premise 1 &rarr; Premise 2 &rarr; Supporting Evidence &rarr; Conclusion</p>
          <p className="mt-2 italic">(&quot;Trace development of this idea&quot; will be a feature here)</p>
        </div>
      </div>
      
      <div className="mt-6 p-4 border border-dashed border-gray-400 rounded-md bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Developer Notes (Pro Feature):</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Requires logic to extract plot points (fiction) or argument structure (non-fiction).</li>
          <li>Visualization should be zoomable and interactive.</li>
          <li>Feature will be gated for &quot;Pro&quot; tier users.</li>
          <li>Investigate libraries suitable for timeline or flow diagram rendering.</li>
        </ul>
      </div>
    </div>
  );
} 