# 🛠️ Database Migration Troubleshooting Guide

## ✅ Fixed Migration File Available

The original migration had a syntax error. Use the **fixed version**:

**Use this file**: `conversation-persistence-migration-fixed.sql`

## 🚨 Common Issues & Solutions

### Issue 1: "type 'idx_messages_session_created' does not exist"
**Problem**: Incorrect index syntax in table definition  
**Solution**: ✅ Fixed in the new migration file

### Issue 2: "relation 'user_learning_profiles' does not exist"
**Problem**: The migration tries to modify a table that doesn't exist  
**Solution**: ✅ Fixed - now checks if table exists before modifying

### Issue 3: "constraint already exists"
**Problem**: Running migration multiple times  
**Solution**: ✅ Fixed - all operations are now idempotent (safe to run multiple times)

## 📋 Migration Steps

### Step 1: Use the Fixed Migration
1. Go to Supabase Dashboard → SQL Editor
2. **Use this file**: `conversation-persistence-migration-fixed.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **Run**

### Step 2: Verify Success
After running, you should see these success messages:
```
✅ Conversation persistence migration completed successfully!
📊 Created tables: ai_conversation_sessions, ai_conversation_messages, ai_conversation_context
🔒 Row Level Security policies applied
⚡ Performance indexes created
🎯 Triggers and functions installed
```

### Step 3: Test the Tables
Run this verification query:
```sql
-- Check if tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN (
    'ai_conversation_sessions',
    'ai_conversation_messages', 
    'ai_conversation_context'
)
ORDER BY table_name;

-- Check if indexes were created
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE tablename LIKE 'ai_conversation%'
ORDER BY tablename, indexname;
```

## 🔧 Manual Fixes (If Needed)

### If You Still Get Errors

**Option 1: Clean Slate**
If you have partial tables, drop them first:
```sql
DROP TABLE IF EXISTS ai_conversation_context CASCADE;
DROP TABLE IF EXISTS ai_conversation_messages CASCADE;
DROP TABLE IF EXISTS ai_conversation_sessions CASCADE;
```

Then run the fixed migration.

**Option 2: Minimal Migration**
If you want just the core tables without the user_learning_profiles extensions:
```sql
-- Core tables only (copy this if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE ai_conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    session_title TEXT,
    reading_mode TEXT NOT NULL CHECK (reading_mode IN ('fiction', 'non-fiction')),
    knowledge_lens TEXT NOT NULL CHECK (knowledge_lens IN ('literary', 'knowledge')),
    user_tier TEXT NOT NULL CHECK (user_tier IN ('FREE', 'PREMIUM', 'PRO')),
    is_active BOOLEAN DEFAULT TRUE,
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_conversation_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    chunk_context INTEGER,
    context_metadata JSONB DEFAULT '{}',
    message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'quick_action', 'feedback', 'system')),
    quick_action_id TEXT,
    user_feedback TEXT CHECK (user_feedback IN ('helpful', 'too_long', 'too_short', 'off_topic')),
    ai_confidence_score DECIMAL(3,2),
    token_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_conversation_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_conversation_sessions(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL CHECK (context_type IN ('topics_discussed', 'user_preferences', 'reading_progress', 'learning_insights')),
    context_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.80,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, context_type)
);

-- Enable RLS
ALTER TABLE ai_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_context ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can manage their own conversation sessions" ON ai_conversation_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own conversation messages" ON ai_conversation_messages
    FOR ALL USING (EXISTS (
        SELECT 1 FROM ai_conversation_sessions 
        WHERE id = ai_conversation_messages.session_id AND user_id = auth.uid()
    ));

CREATE POLICY "Users can manage their own conversation context" ON ai_conversation_context
    FOR ALL USING (EXISTS (
        SELECT 1 FROM ai_conversation_sessions 
        WHERE id = ai_conversation_context.session_id AND user_id = auth.uid()
    ));
```

## ✅ Success Indicators

After successful migration, you should be able to:

1. **See the tables** in Supabase Dashboard → Table Editor
2. **Run queries** without errors:
   ```sql
   SELECT COUNT(*) FROM ai_conversation_sessions;
   ```
3. **See RLS policies** in Table Editor → RLS tab
4. **Test the enhanced AI assistant** in your app

## 🎯 Next Steps After Migration

1. **Deploy your application** with the enhanced AI assistant
2. **Test the memory features** by having conversations that persist
3. **Monitor the database** for performance and usage
4. **Collect user feedback** on the new intelligent features

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check your Supabase logs** in Dashboard → Logs
2. **Verify your database schema** matches your application code
3. **Test with a simple query** to ensure basic connectivity
4. **Contact support** with the specific error message

---

**Remember**: The enhanced AI assistant will work even if the migration fails - it will gracefully fall back to the basic chat functionality. The migration just enables the advanced memory and personalization features. 