import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const author = searchParams.get('author');
  const title = searchParams.get('title');

  if (!query && !author && !title) {
    return NextResponse.json(
      { error: 'Missing search query. Please provide a general query, author, or title.' },
      { status: 400 }
    );
  }

  const gutendexSearchParams = new URLSearchParams();

  if (query) {
    gutendexSearchParams.append('search', query);
  } else {
    // Gutendex seems to work best with a single 'search' param combining author and title
    let combinedQuery = '';
    if (title) combinedQuery += `${title} `;
    if (author) combinedQuery += `${author}`;
    if (combinedQuery.trim()) {
      gutendexSearchParams.append('search', combinedQuery.trim());
    }
  }
  // We can add more specific filters if needed, like language
  // gutendexSearchParams.append('languages', 'en');

  try {
    const response = await fetch(`https://gutendex.com/books?${gutendexSearchParams.toString()}`);
    if (!response.ok) {
      console.error('Gutendex API error:', response.status, await response.text());
      return NextResponse.json(
        { error: `Failed to fetch from Gutendex: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform data to a more usable format for the frontend if necessary
    const books = data.results.map((book: any) => ({
      id: book.id,
      title: book.title,
      authors: book.authors.map((a: any) => a.name).join(', '),
      subjects: book.subjects.join(', '),
      bookshelves: book.bookshelves.join(', '),
      languages: book.languages.join(', '),
      download_count: book.download_count,
      formats: book.formats, // Contains links to various formats like text/plain, application/epub+zip etc.
    }));

    return NextResponse.json({ books, count: data.count, next: data.next, previous: data.previous });
  } catch (error) {
    console.error('Error fetching from Gutendex:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching from Gutendex' },
      { status: 500 }
    );
  }
} 