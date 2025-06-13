-- Fix RLS policies for public_books table
-- The current policy uses auth.role() = 'authenticated' which might not work correctly
-- Let's use the standard auth.uid() IS NOT NULL pattern

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can view public books" ON public_books;

-- Create a new policy with the correct syntax
CREATE POLICY "Authenticated users can view public books" ON public_books
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Also ensure RLS is enabled
ALTER TABLE public_books ENABLE ROW LEVEL SECURITY;

-- Let's also check if there are any issues with the user_books policies
-- Drop and recreate the user_books policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view own books" ON user_books;
DROP POLICY IF EXISTS "Users can insert own books" ON user_books;
DROP POLICY IF EXISTS "Users can update own books" ON user_books;
DROP POLICY IF EXISTS "Users can delete own books" ON user_books;

-- Recreate user_books policies
CREATE POLICY "Users can view own books" ON user_books
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own books" ON user_books
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own books" ON user_books
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own books" ON user_books
    FOR DELETE USING (auth.uid() = user_id);

-- Ensure RLS is enabled on user_books
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY; 