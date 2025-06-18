# 🔧 Integration Guide: Intelligent AI Assistant (Lio)

## 🚀 **Quick Start**

This guide will help you integrate the new intelligent, persistent AI assistant into your Recaplio app.

## 📋 **Prerequisites**

- ✅ Supabase project with admin access
- ✅ OpenAI API key configured
- ✅ Existing Recaplio app running

## 🎯 **Step-by-Step Integration**

### Step 1: Database Migration 🗄️

1. **Connect to your Supabase project**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor

2. **Run the migration**
   ```sql
   -- Copy and paste the contents of conversation-persistence-migration.sql
   -- Execute the migration to create the new tables
   ```

3. **Verify tables created**
   ```sql
   -- Check that these tables exist:
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'ai_conversation%';
   ```

### Step 2: Update Reader Page 📖

Find your reader page (likely in `src/app/reader/[bookId]/page.tsx` or similar) and update the AI Assistant import:

```tsx
// BEFORE: Replace this import
import AIAssistant from '@/components/reader/AIAssistant';

// AFTER: With this import
import EnhancedAIAssistant from '@/components/reader/EnhancedAIAssistant';
```

Update the component usage:

```tsx
// BEFORE: Replace this component
<AIAssistant
  bookId={bookId}
  currentChunkIndex={currentChunkIndex}
  userTier={userTier}
  readingMode={readingMode}
  knowledgeLens={knowledgeLens}
/>

// AFTER: With this enhanced component
<EnhancedAIAssistant
  bookId={bookId}
  currentChunkIndex={currentChunkIndex}
  userTier={userTier}
  readingMode={readingMode}
  knowledgeLens={knowledgeLens}
  userId={user.id} // Add user ID for conversation persistence
  enableConversationMemory={userTier !== 'FREE'} // Enable for paid tiers
/>
```

### Step 3: Test the Integration 🧪

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Test basic functionality**
   - Open a book in the reader
   - Ask Lio a question
   - Verify the response works

3. **Test memory features** (for PREMIUM/PRO users)
   - Ask a question, then refresh the page
   - Verify conversation history loads
   - Check that the memory indicator appears
   - Test the feedback buttons

### Step 4: Monitor and Debug 🔍

1. **Check browser console** for any errors
2. **Check server logs** for backend issues
3. **Verify database** - check that conversations are being saved

## 🎨 **Customization Options**

### Memory Settings
```tsx
// Always enable memory (all tiers)
enableConversationMemory={true}

// Disable memory (fallback to basic chat)
enableConversationMemory={false}

// Tier-based (recommended)
enableConversationMemory={userTier !== 'FREE'}
```

### Styling Customization
The enhanced component uses the same styling system as the original. You can:
- Modify colors in the component file
- Adjust the memory indicator appearance
- Customize feedback button styles

## 🚨 **Troubleshooting**

### Common Issues

**❌ "Failed to get AI response"**
- Check OpenAI API key is set
- Verify API endpoint is accessible
- Check server logs for detailed error

**❌ "Memory indicator not showing"**
- Ensure `enableConversationMemory={true}`
- Check user authentication
- Verify database tables exist

**❌ "Conversation history not loading"**
- Check database connection
- Verify conversation service is working
- Check browser network tab for API errors

**❌ "Feedback buttons not working"**
- Ensure feedback API endpoint exists
- Check user authentication
- Verify database write permissions

### Debug Commands

```bash
# Check if new API endpoints work
curl -X GET "http://localhost:3000/api/ai/enhanced-chat?userId=test"

# Check database tables
# (Run in Supabase SQL editor)
SELECT COUNT(*) FROM ai_conversation_sessions;
SELECT COUNT(*) FROM ai_conversation_messages;
SELECT COUNT(*) FROM ai_conversation_context;
```

## 📊 **Monitoring Success**

### Key Metrics to Watch

1. **User Engagement**
   - Average conversation length
   - Return rate to continue conversations
   - Feedback button usage

2. **Technical Performance**
   - Response time with memory enabled
   - Database query performance
   - Error rates

3. **User Satisfaction**
   - Positive feedback percentage
   - Feature usage (memory indicator clicks)
   - Support tickets related to AI

## 🔄 **Rollback Plan**

If you need to rollback to the original AI Assistant:

1. **Revert component import**
   ```tsx
   // Change back to:
   import AIAssistant from '@/components/reader/AIAssistant';
   
   // And use:
   <AIAssistant {...originalProps} />
   ```

2. **Database cleanup** (optional)
   ```sql
   -- Only if you want to remove the new tables
   DROP TABLE IF EXISTS ai_conversation_context;
   DROP TABLE IF EXISTS ai_conversation_messages;
   DROP TABLE IF EXISTS ai_conversation_sessions;
   ```

## 🎯 **Next Steps After Integration**

1. **Collect User Feedback**
   - Monitor user reactions to the new features
   - Gather feedback on conversation quality
   - Track usage patterns

2. **Performance Optimization**
   - Monitor database performance
   - Optimize conversation history queries
   - Implement caching if needed

3. **Feature Enhancement**
   - Add conversation export functionality
   - Implement conversation search
   - Add conversation sharing features

## 💡 **Tips for Success**

1. **Start Small**: Enable memory for a subset of users first
2. **Monitor Closely**: Watch for performance issues in the first week
3. **Gather Feedback**: Ask users about their experience with the new features
4. **Iterate Quickly**: Use feedback to improve the experience

---

## 🆘 **Need Help?**

If you encounter issues during integration:

1. Check the implementation plan: `INTELLIGENT_AI_IMPLEMENTATION_PLAN.md`
2. Review the code comments in the new files
3. Test with the original AI Assistant to isolate issues
4. Check Supabase logs for database-related problems

---

*This integration transforms Lio from a simple Q&A bot into an intelligent companion that remembers conversations and learns user preferences, creating a truly personalized reading experience.* 