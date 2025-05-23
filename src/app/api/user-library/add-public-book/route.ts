import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../utils/supabase/server'; // For user-context actions

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient(); // Use server client that handles user sessions

  try {
    // 1. Get user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error fetching user or no user session:', userError);
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    // 2. Get public_book_db_id from request body
    const body = await request.json();
    const { public_book_db_id } = body;

    if (!public_book_db_id || typeof public_book_db_id !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid public_book_db_id (must be a number).' },
        { status: 400 }
      );
    }

    // 3. Check if the public book exists (optional but good practice)
    const { data: publicBookExists, error: checkError } = await supabase
      .from('public_books')
      .select('id')
      .eq('id', public_book_db_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking public book existence:', checkError);
      return NextResponse.json({ error: 'Error verifying book.', details: checkError.message }, { status: 500 });
    }

    if (!publicBookExists) {
      return NextResponse.json({ error: 'Public book not found.' }, { status: 404 });
    }

    // 4. Insert into user_books table
    const { data: newUserBook, error: insertError } = await supabase
      .from('user_books')
      .insert({
        user_id: user.id,
        public_book_db_id: public_book_db_id,
        // added_at is default, reading_progress_percent is default
      })
      .select() // Select the newly inserted row
      .single(); // Expect a single row back

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation code
        return NextResponse.json(
          { message: 'Book is already in your library.', error_code: 'already_exists' },
          { status: 409 } // 409 Conflict
        );
      }
      console.error('Supabase error inserting into user_books:', insertError);
      return NextResponse.json(
        { error: 'Failed to add book to library.', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Book added to library successfully!', userBookEntry: newUserBook },
      { status: 201 } // 201 Created
    );

  } catch (err: any) {
    console.error('Add to library API error:', err);
    if (err.name === 'SyntaxError') { // JSON parsing error
        return NextResponse.json({ error: 'Invalid request body. Expected JSON.'}, { status: 400 });
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: err.message },
      { status: 500 }
    );
  }
} 