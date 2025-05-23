import { NextResponse } from 'next/server';

export async function GET(request, context) {
  const { params } = context;
  const book_id = params.book_id;

  // For debugging, ensure request is used to avoid unused var errors if any
  const userAgent = request.headers.get('user-agent');
  console.log(`Minimal route hit for book_id: ${book_id}, User-Agent: ${userAgent}`);

  return NextResponse.json({ message: `Book ID received: ${book_id}` });
} 