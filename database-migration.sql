-- Comprehensive migration script to fix annotations table
-- Run this in your Supabase SQL editor

-- First, check if annotations table exists and create it if it doesn't
DO $$ 
BEGIN
    -- Create annotations table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'annotations') THEN
        CREATE TABLE annotations (
            id SERIAL PRIMARY KEY,
            user_book_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('highlight', 'bookmark', 'note')),
            start_offset INTEGER NOT NULL,
            end_offset INTEGER NOT NULL,
            text_content TEXT NOT NULL,
            annotation_data JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add foreign key constraint
        ALTER TABLE annotations ADD CONSTRAINT fk_annotations_user_book_id 
            FOREIGN KEY (user_book_id) REFERENCES user_books(id) ON DELETE CASCADE;
        
        -- Enable RLS
        ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policy
        CREATE POLICY "Users can manage own annotations" ON annotations
            FOR ALL USING (EXISTS (
                SELECT 1 FROM user_books WHERE id = annotations.user_book_id AND user_id = auth.uid()
            ));
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_annotations_user_book_id ON annotations(user_book_id);
        
        -- Create trigger for updated_at
        CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Created annotations table with all columns and constraints';
    ELSE
        RAISE NOTICE 'Annotations table already exists, checking for missing columns...';
        
        -- Add missing columns if they don't exist
        
        -- Add type column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'annotations' AND column_name = 'type'
        ) THEN
            ALTER TABLE annotations ADD COLUMN type TEXT NOT NULL DEFAULT 'highlight' CHECK (type IN ('highlight', 'bookmark', 'note'));
            RAISE NOTICE 'Added type column to annotations table';
        END IF;
        
        -- Add start_offset column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'annotations' AND column_name = 'start_offset'
        ) THEN
            ALTER TABLE annotations ADD COLUMN start_offset INTEGER NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added start_offset column to annotations table';
        END IF;
        
        -- Add end_offset column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'annotations' AND column_name = 'end_offset'
        ) THEN
            ALTER TABLE annotations ADD COLUMN end_offset INTEGER NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added end_offset column to annotations table';
        END IF;
        
        -- Add text_content column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'annotations' AND column_name = 'text_content'
        ) THEN
            ALTER TABLE annotations ADD COLUMN text_content TEXT NOT NULL DEFAULT '';
            RAISE NOTICE 'Added text_content column to annotations table';
        END IF;
        
        -- Add annotation_data column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'annotations' AND column_name = 'annotation_data'
        ) THEN
            ALTER TABLE annotations ADD COLUMN annotation_data JSONB DEFAULT '{}';
            RAISE NOTICE 'Added annotation_data column to annotations table';
        END IF;
        
        -- Add user_book_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'annotations' AND column_name = 'user_book_id'
        ) THEN
            ALTER TABLE annotations ADD COLUMN user_book_id INTEGER NOT NULL DEFAULT 1;
            RAISE NOTICE 'Added user_book_id column to annotations table';
        END IF;
        
        -- Add created_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'annotations' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE annotations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added created_at column to annotations table';
        END IF;
        
        -- Add updated_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'annotations' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE annotations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column to annotations table';
        END IF;
        
        RAISE NOTICE 'Finished checking and adding missing columns to annotations table';
    END IF;
    
    -- Ensure RLS is enabled (safe to run multiple times)
    ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
    
    -- Create or replace the RLS policy (safe to run multiple times)
    DROP POLICY IF EXISTS "Users can manage own annotations" ON annotations;
    CREATE POLICY "Users can manage own annotations" ON annotations
        FOR ALL USING (EXISTS (
            SELECT 1 FROM user_books WHERE id = annotations.user_book_id AND user_id = auth.uid()
        ));
    
    -- Create index if it doesn't exist (safe to run multiple times)
    CREATE INDEX IF NOT EXISTS idx_annotations_user_book_id ON annotations(user_book_id);
    
    RAISE NOTICE 'Migration completed successfully!';
    
END $$; 

-- User Learning Profiles for AI Personalization
CREATE TABLE user_learning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_response_style TEXT NOT NULL DEFAULT 'detailed' CHECK (preferred_response_style IN ('concise', 'detailed', 'comprehensive')),
    learning_pace TEXT NOT NULL DEFAULT 'moderate' CHECK (learning_pace IN ('quick', 'moderate', 'thorough')),
    interests TEXT[] DEFAULT '{}',
    reading_goals TEXT[] DEFAULT '{}',
    interaction_history JSONB DEFAULT '{
        "total_questions": 0,
        "favorite_topics": [],
        "complexity_preference": "moderate"
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for faster user profile lookups
CREATE INDEX idx_user_learning_profiles_user_id ON user_learning_profiles(user_id);

-- RLS policies for user learning profiles
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own learning profile" ON user_learning_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning profile" ON user_learning_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning profile" ON user_learning_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_learning_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_learning_profile_updated_at
    BEFORE UPDATE ON user_learning_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_learning_profile_updated_at(); 