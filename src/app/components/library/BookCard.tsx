import Link from 'next/link';
import Image from 'next/image'; // Import next/image
import { Book } from '@/types/book'; // Using the main Book type

// Update BookCardProps to be a subset of Book or use Book directly if all fields are relevant
export type BookCardProps = Pick<Book, 
  'id' | 'title' | 'author' | 'genre' | 'readingProgress' | 'coverImageUrl' | 'isPinned'
>; // Add or remove fields as needed for the card display

const BookCard = ({ id, title, author, genre, readingProgress, coverImageUrl, isPinned }: BookCardProps) => {
  return (
    <Link href={`/library/${id}`} className="block group h-full">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 ease-in-out h-full flex flex-col">
        {coverImageUrl ? (
          <Image src={coverImageUrl} alt={`Cover of ${title}`} width={300} height={192} className="w-full h-48 object-cover object-center" />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4V5h12v10zm-4.293-2.707a1 1 0 00-1.414-1.414L10 10.586l-1.293-1.293a1 1 0 00-1.414 1.414L8.586 12l-1.293 1.293a1 1 0 101.414 1.414L10 13.414l1.293 1.293a1 1 0 001.414-1.414L11.414 12l1.293-1.293z" clipRule="evenodd" />
            </svg>
            {/* <span className="text-gray-500 text-sm">No Cover</span> */}
          </div>
        )}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold mb-1 truncate group-hover:text-indigo-600" title={title}>{title}</h3>
          <p className="text-sm text-gray-600 mb-2 truncate" title={author}>{author}</p>
          {genre && <p className="text-xs text-gray-500 mb-3 capitalize">Genre: {genre}</p>}
          
          <div className="mt-auto pt-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${readingProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-right text-gray-500">{readingProgress}% complete</p>
            {isPinned && (
              <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-md shadow">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v4.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 8.586V4a1 1 0 011-1zM5 16a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Pinned
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BookCard; 