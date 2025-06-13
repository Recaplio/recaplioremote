-- Study Tools Schema for Recaplio
-- This file contains the database schema for Study Tools features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (handled by Supabase Auth)
-- This table is automatically created by Supabase Auth

-- Subscriptions table for user billing
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_id TEXT NOT NULL DEFAULT 'free' CHECK (plan_id IN ('free', 'premium', 'pro')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'trialing', 'past_due')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public books table (Project Gutenberg catalog)
CREATE TABLE IF NOT EXISTS public_books (
    id SERIAL PRIMARY KEY,
    gutenberg_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    authors JSONB, -- Array of author objects with name, birth_year, death_year
    genre TEXT,
    language TEXT DEFAULT 'en',
    download_url TEXT,
    processed_status TEXT DEFAULT 'raw' CHECK (processed_status IN ('raw', 'chunked', 'embedded')),
    cover_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User books table (user's personal library)
CREATE TABLE IF NOT EXISTS user_books (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    public_book_db_id INTEGER REFERENCES public_books(id) ON DELETE CASCADE, -- For Project Gutenberg books
    title TEXT, -- For uploaded books or override
    author TEXT, -- For uploaded books or override
    genre TEXT,
    reading_mode TEXT DEFAULT 'fiction' CHECK (reading_mode IN ('fiction', 'non-fiction')),
    reading_progress_percent INTEGER DEFAULT 0 CHECK (reading_progress_percent >= 0 AND reading_progress_percent <= 100),
    current_chunk_index INTEGER DEFAULT 0,
    pinned BOOLEAN DEFAULT FALSE,
    file_url TEXT, -- For uploaded books stored in Supabase Storage
    original_filename TEXT, -- Original filename for uploaded books
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book chunks table (text segments for both public and user books)
CREATE TABLE IF NOT EXISTS book_chunks (
    id SERIAL PRIMARY KEY,
    public_book_id INTEGER REFERENCES public_books(id) ON DELETE CASCADE, -- For public books
    user_book_id INTEGER REFERENCES user_books(id) ON DELETE CASCADE, -- For user uploaded books
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    start_char_offset INTEGER,
    end_char_offset INTEGER,
    vector_id TEXT, -- Reference to vector database entry
    embedding_status TEXT DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'embedded', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure chunk belongs to either public or user book, not both
    CHECK ((public_book_id IS NOT NULL AND user_book_id IS NULL) OR (public_book_id IS NULL AND user_book_id IS NOT NULL))
);

-- Annotations table (highlights, bookmarks, notes)
CREATE TABLE IF NOT EXISTS annotations (
    id SERIAL PRIMARY KEY,
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('highlight', 'bookmark', 'note')),
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    annotation_data JSONB DEFAULT '{}', -- Store color, notes, chunk_index, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcards table (Pro feature)
CREATE TABLE IF NOT EXISTS flashcards (
    id SERIAL PRIMARY KEY,
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    annotation_id INTEGER REFERENCES annotations(id) ON DELETE SET NULL, -- Optional link to annotation
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5), -- Spaced repetition difficulty
    next_review_date TIMESTAMPTZ DEFAULT NOW(),
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz sessions table (Pro feature)
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id SERIAL PRIMARY KEY,
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    quiz_type TEXT NOT NULL CHECK (quiz_type IN ('multiple_choice', 'true_false', 'short_answer', 'mixed')),
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    time_taken_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions table (Pro feature)
CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    correct_answer TEXT NOT NULL,
    options JSONB, -- For multiple choice questions
    user_answer TEXT,
    is_correct BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export history table (Pro feature)
CREATE TABLE IF NOT EXISTS export_history (
    id SERIAL PRIMARY KEY,
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL CHECK (export_type IN ('notion', 'markdown', 'pdf', 'docx')),
    file_url TEXT, -- Link to exported file if stored
    exported_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI recaps table (all tiers, quality differs)
CREATE TABLE IF NOT EXISTS ai_recaps (
    id SERIAL PRIMARY KEY,
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    recap_type TEXT NOT NULL CHECK (recap_type IN ('progress', 'chapter', 'full_book')),
    content TEXT NOT NULL,
    user_tier TEXT NOT NULL CHECK (user_tier IN ('FREE', 'PREMIUM', 'PRO')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_public_book_id ON user_books(public_book_db_id);
CREATE INDEX IF NOT EXISTS idx_book_chunks_public_book_id ON book_chunks(public_book_id);
CREATE INDEX IF NOT EXISTS idx_book_chunks_user_book_id ON book_chunks(user_book_id);
CREATE INDEX IF NOT EXISTS idx_book_chunks_chunk_index ON book_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_annotations_user_book_id ON annotations(user_book_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_book_id ON flashcards(user_book_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recaps ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- User books policies
CREATE POLICY "Users can view own books" ON user_books
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own books" ON user_books
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own books" ON user_books
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own books" ON user_books
    FOR DELETE USING (auth.uid() = user_id);

-- Book chunks policies (users can access chunks for their books)
CREATE POLICY "Users can view chunks for their books" ON book_chunks
    FOR SELECT USING (
        (user_book_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM user_books WHERE id = book_chunks.user_book_id AND user_id = auth.uid()
        )) OR
        (public_book_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM user_books WHERE public_book_db_id = book_chunks.public_book_id AND user_id = auth.uid()
        ))
    );

-- Annotations policies
CREATE POLICY "Users can manage own annotations" ON annotations
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_books WHERE id = annotations.user_book_id AND user_id = auth.uid()
    ));

-- Flashcards policies
CREATE POLICY "Users can manage own flashcards" ON flashcards
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_books WHERE id = flashcards.user_book_id AND user_id = auth.uid()
    ));

-- Quiz sessions policies
CREATE POLICY "Users can manage own quiz sessions" ON quiz_sessions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_books WHERE id = quiz_sessions.user_book_id AND user_id = auth.uid()
    ));

-- Quiz questions policies
CREATE POLICY "Users can manage own quiz questions" ON quiz_questions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM quiz_sessions qs 
        JOIN user_books ub ON qs.user_book_id = ub.id 
        WHERE qs.id = quiz_questions.quiz_session_id AND ub.user_id = auth.uid()
    ));

-- Export history policies
CREATE POLICY "Users can view own export history" ON export_history
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM user_books WHERE id = export_history.user_book_id AND user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own export history" ON export_history
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM user_books WHERE id = export_history.user_book_id AND user_id = auth.uid()
    ));

-- AI recaps policies
CREATE POLICY "Users can manage own AI recaps" ON ai_recaps
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_books WHERE id = ai_recaps.user_book_id AND user_id = auth.uid()
    ));

-- Public books table is readable by all authenticated users (no RLS needed for read access)
-- But we'll add RLS for consistency
ALTER TABLE public_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view public books" ON public_books
    FOR SELECT USING (auth.role() = 'authenticated');

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_books_updated_at BEFORE UPDATE ON public_books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_books_updated_at BEFORE UPDATE ON user_books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 