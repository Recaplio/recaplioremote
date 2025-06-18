-- Conversation Persistence Migration for Recaplio AI Assistant (Lio) - CLEAN VERSION
-- This migration adds tables for persistent, intelligent conversations

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- AI Conversation Sessions Table
-- Groups related messages together (per book, per reading session)
CREATE TABLE IF NOT EXISTS ai_conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    session_title TEXT, -- Auto-generated or user-defined title
    reading_mode TEXT NOT NULL CHECK (reading_mode IN ('fiction', 'non-fiction')),
    knowledge_lens TEXT NOT NULL CHECK (knowledge_lens IN ('literary', 'knowledge')),
    user_tier TEXT NOT NULL CHECK (user_tier IN ('FREE', 'PREMIUM', 'PRO')),
    is_active BOOLEAN DEFAULT TRUE, -- Current active session for this book
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Conversation Messages Table
-- Stores individual messages with context and metadata
CREATE TABLE IF NOT EXISTS ai_conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_conversation_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    chunk_context INTEGER, -- Which chunk user was reading when they asked
    context_metadata JSONB DEFAULT '{}', -- Store reading position, highlights, etc.
    message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'quick_action', 'feedback', 'system')),
    quick_action_id TEXT, -- If this was triggered by a quick action
    user_feedback TEXT CHECK (user_feedback IN ('helpful', 'too_long', 'too_short', 'off_topic')),
    ai_confidence_score DECIMAL(3,2), -- AI's confidence in its response (0.00-1.00)
    token_count INTEGER, -- Track token usage for analytics
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Conversation Context Table
-- Stores conversation-level insights and memory
CREATE TABLE IF NOT EXISTS ai_conversation_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_conversation_sessions(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL CHECK (context_type IN ('topics_discussed', 'user_preferences', 'reading_progress', 'learning_insights')),
    context_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.80,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, context_type)
);

-- Add unique constraint for active sessions (only one active per user per book)
-- We do this separately to avoid issues with table creation
DO $$ 
BEGIN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_conversation_sessions_unique_active'
    ) THEN
        ALTER TABLE ai_conversation_sessions 
        ADD CONSTRAINT ai_conversation_sessions_unique_active 
        UNIQUE(user_id, user_book_id, is_active) DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- Enhanced User Learning Profiles (extending existing table)
-- Add conversation-specific learning data - Only if the table exists
DO $$ 
BEGIN
    -- Check if user_learning_profiles table exists first
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_learning_profiles'
    ) THEN
        -- Add new columns to existing user_learning_profiles if they don't exist
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_learning_profiles' AND column_name = 'conversation_style'
        ) THEN
            ALTER TABLE user_learning_profiles 
            ADD COLUMN conversation_style TEXT DEFAULT 'balanced' CHECK (conversation_style IN ('concise', 'balanced', 'detailed', 'comprehensive'));
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_learning_profiles' AND column_name = 'engagement_pattern'
        ) THEN
            ALTER TABLE user_learning_profiles 
            ADD COLUMN engagement_pattern TEXT DEFAULT 'explorer' CHECK (engagement_pattern IN ('explorer', 'deep_diver', 'quick_learner', 'methodical'));
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_learning_profiles' AND column_name = 'learning_level'
        ) THEN
            ALTER TABLE user_learning_profiles 
            ADD COLUMN learning_level TEXT DEFAULT 'intermediate' CHECK (learning_level IN ('beginner', 'intermediate', 'advanced'));
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_learning_profiles' AND column_name = 'memory_preferences'
        ) THEN
            ALTER TABLE user_learning_profiles 
            ADD COLUMN memory_preferences JSONB DEFAULT '{
                "remember_topics": true,
                "remember_questions": true,
                "remember_insights": true,
                "conversation_continuity": true
            }'::jsonb;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_learning_profiles' AND column_name = 'satisfaction_metrics'
        ) THEN
            ALTER TABLE user_learning_profiles 
            ADD COLUMN satisfaction_metrics JSONB DEFAULT '{
                "avg_feedback_score": 0.0,
                "total_conversations": 0,
                "preferred_response_length": "medium",
                "topic_mastery": {}
            }'::jsonb;
        END IF;
    ELSE
        RAISE NOTICE 'user_learning_profiles table does not exist, skipping column additions';
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_book ON ai_conversation_sessions(user_id, user_book_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_active ON ai_conversation_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session ON ai_conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_created ON ai_conversation_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_role_type ON ai_conversation_messages(role, message_type);
CREATE INDEX IF NOT EXISTS idx_conversation_context_session ON ai_conversation_context(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_interaction ON ai_conversation_sessions(last_interaction_at);

-- Row Level Security (RLS) Policies
ALTER TABLE ai_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_context ENABLE ROW LEVEL SECURITY;

-- Conversation Sessions Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can manage their own conversation sessions'
        AND tablename = 'ai_conversation_sessions'
    ) THEN
        CREATE POLICY "Users can manage their own conversation sessions" ON ai_conversation_sessions
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Conversation Messages Policies  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can manage their own conversation messages'
        AND tablename = 'ai_conversation_messages'
    ) THEN
        CREATE POLICY "Users can manage their own conversation messages" ON ai_conversation_messages
            FOR ALL USING (EXISTS (
                SELECT 1 FROM ai_conversation_sessions 
                WHERE id = ai_conversation_messages.session_id AND user_id = auth.uid()
            ));
    END IF;
END $$;

-- Conversation Context Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can manage their own conversation context'
        AND tablename = 'ai_conversation_context'
    ) THEN
        CREATE POLICY "Users can manage their own conversation context" ON ai_conversation_context
            FOR ALL USING (EXISTS (
                SELECT 1 FROM ai_conversation_sessions 
                WHERE id = ai_conversation_context.session_id AND user_id = auth.uid()
            ));
    END IF;
END $$;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_conversation_sessions_updated_at'
    ) THEN
        CREATE TRIGGER update_conversation_sessions_updated_at 
            BEFORE UPDATE ON ai_conversation_sessions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Function to automatically manage active sessions (only one active per user per book)
CREATE OR REPLACE FUNCTION manage_active_session()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a session to active, deactivate all other sessions for this user+book
    IF NEW.is_active = TRUE THEN
        UPDATE ai_conversation_sessions 
        SET is_active = FALSE 
        WHERE user_id = NEW.user_id 
        AND user_book_id = NEW.user_book_id 
        AND id != NEW.id 
        AND is_active = TRUE;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'manage_active_session_trigger'
    ) THEN
        CREATE TRIGGER manage_active_session_trigger
            BEFORE INSERT OR UPDATE ON ai_conversation_sessions
            FOR EACH ROW EXECUTE FUNCTION manage_active_session();
    END IF;
END $$;

-- Function to update last_interaction_at when messages are added
CREATE OR REPLACE FUNCTION update_session_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_conversation_sessions 
    SET last_interaction_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_session_interaction_trigger'
    ) THEN
        CREATE TRIGGER update_session_interaction_trigger
            AFTER INSERT ON ai_conversation_messages
            FOR EACH ROW EXECUTE FUNCTION update_session_interaction();
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Conversation persistence migration completed successfully!';
    RAISE NOTICE 'Created tables: ai_conversation_sessions, ai_conversation_messages, ai_conversation_context';
    RAISE NOTICE 'Row Level Security policies applied';
    RAISE NOTICE 'Performance indexes created';
    RAISE NOTICE 'Triggers and functions installed';
END $$; 