# Recaplio AI Functionality Setup Guide

This guide explains how to set up and use the AI functionality that has been implemented in Recaplio.

## 🚀 Features Implemented

### 1. AI Reading Assistant
- **Context-aware RAG (Retrieval-Augmented Generation)** system
- **Tiered AI models** based on user subscription (Free/Premium/Pro)
- **Reading modes**: Fiction vs Non-fiction
- **Knowledge lens**: Literary vs Knowledge focus
- **Real-time chat** interface in the reader
- **Current page awareness**: AI can read and analyze the current page/chunk you're viewing

### 2. Semantic Search
- **Vector-based search** within books using OpenAI embeddings
- **Similarity scoring** for search results
- **Contextual navigation** to relevant book sections

### 3. Embedding System
- **Automatic embedding generation** during book ingestion (NEW!)
- **Pinecone vector database** integration
- **Batch processing** scripts for existing content
- **Real-time context**: AI always has access to your current reading position

## 🔧 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the `recaplio-app` directory with the following variables:

```bash
# Supabase Configuration (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration (NEW - REQUIRED)
OPENAI_API_KEY=sk-your-openai-api-key

# Pinecone Configuration (NEW - REQUIRED)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=recaplio-embeddings

# Optional: Stripe (for subscription tiers)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 2. Get API Keys

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Add it to your `.env.local` as `OPENAI_API_KEY`

#### Pinecone API Key
1. Go to [Pinecone](https://www.pinecone.io/)
2. Create an account or sign in
3. Create a new project
4. Get your API key from the dashboard
5. Add it to your `.env.local` as `PINECONE_API_KEY`

### 3. Database Schema Updates

The following tables should already exist in your Supabase database:
- `user_books` - User's book library
- `public_books` - Public domain books
- `book_chunks` - Book content chunks
- `subscriptions` - User subscription tiers (optional)

### 4. Automatic Embedding Generation

**NEW**: Embeddings are now automatically generated when books are ingested! 

When you add a new book from Project Gutenberg:
1. The book text is downloaded and processed into chunks
2. Embeddings are automatically generated for each chunk
3. Embeddings are stored in Pinecone for instant AI access
4. The AI can immediately provide context-aware responses

For existing books without embeddings, you can still use the manual script:

```bash
# Generate embeddings for all books
npm run embeddings

# Or generate for a specific book
npm run embeddings -- --book 1
```

## 🎯 How to Use

### 1. AI Reading Assistant

1. **Open any book** in the reader (`/reader/[userBookId]`)
2. **The AI automatically knows your current page** - no setup needed!
3. **Use the AI Assistant** panel on the right side
4. **Toggle reading modes**:
   - **Fiction**: Focus on characters, themes, plot
   - **Non-fiction**: Focus on arguments, concepts, frameworks
5. **Toggle knowledge lens**:
   - **Literary**: Emphasizes literary analysis
   - **Knowledge**: Emphasizes information extraction
6. **Ask questions** like:
   - "Summarize this chapter" (AI knows your current page!)
   - "What are the main themes?"
   - "Explain this concept"
   - "Who is this character?"

### 2. Semantic Search

1. **Use the search bar** at the top of the reader
2. **Enter semantic queries** like:
   - "love and betrayal" (themes)
   - "main character development"
   - "economic theories" (concepts)
3. **Click on results** to navigate to relevant sections

### 3. User Tiers

The system supports three tiers with different AI capabilities and intelligent response management:

- **Free**: Basic GPT-3.5, 200-300 tokens (1-2 paragraphs), 1 book limit
- **Premium**: Enhanced GPT-3.5, 400-500 tokens (2-3 paragraphs), 10 books
- **Pro**: GPT-4, 600-800 tokens (3-4 paragraphs), unlimited books

**Smart Response System**: Token limits automatically adjust based on query complexity to ensure complete responses:
- Simple questions ("What is...") use fewer tokens for concise answers
- Complex analysis ("Analyze themes...") use full token allocation
- List-based queries ("Main points...") use moderate tokens for structured responses

## 🔍 API Endpoints

### Chat with AI
```
POST /api/ai/chat
```

Request body:
```json
{
  "query": "Summarize this chapter",
  "bookId": 1,
  "currentChunkIndex": 5,
  "readingMode": "fiction",
  "knowledgeLens": "literary",
  "conversationHistory": []
}
```

### Semantic Search
```
POST /api/search/semantic
```

Request body:
```json
{
  "query": "love and betrayal",
  "bookId": 1,
  "limit": 10
}
```

### Debug Endpoints (Development)
```
GET /api/debug/book-info/[userBookId]  # Check book and chunk info
GET /api/debug/embeddings/[bookId]     # Test embedding functionality
```

## 🛠️ Technical Architecture

### Components Created
- `AIAssistant.tsx` - Main AI chat interface with current page awareness
- `SemanticSearch.tsx` - Search component
- `ChunkSelector.tsx` - Navigation component (already existed)

### AI Libraries
- `lib/ai/config.ts` - AI configuration and models
- `lib/ai/embeddings.ts` - Embedding generation and storage
- `lib/ai/rag.ts` - RAG system with current page context

### API Routes
- `api/ai/chat/route.ts` - AI chat endpoint with current page support
- `api/search/semantic/route.ts` - Semantic search endpoint
- `api/gutenberg/books/[id]/ingest/route.ts` - Book ingestion with automatic embeddings

## 🚨 Important Notes

1. **API Costs**: OpenAI and Pinecone usage will incur costs based on usage
2. **Rate Limits**: The system includes rate limiting and error handling
3. **Security**: All endpoints require authentication
4. **Performance**: Embeddings are generated automatically during book ingestion
5. **Current Page Awareness**: AI always knows what page you're reading

## 🐛 Troubleshooting

### Common Issues

1. **"AI service configuration error"**
   - Check your OpenAI API key
   - Ensure you have sufficient credits

2. **"Search service temporarily unavailable"**
   - Check your Pinecone API key
   - Verify the index name matches

3. **"I don't have access to the specific page"**
   - This should no longer happen with the new current page awareness
   - If it does, check that the book has been properly ingested with chunks

4. **"No relevant passages found"**
   - For new books: Embeddings are generated automatically during ingestion
   - For old books: Run `npm run embeddings` to generate missing embeddings
   - Try different search terms

### Debug Mode

Add this to your `.env.local` for detailed logging:
```bash
DEBUG=true
```

### Testing AI Functionality

Visit these debug endpoints (when logged in):
- `/api/debug/book-info/54` - Check if your book has chunks and current page info
- `/api/debug/embeddings/[bookId]` - Test embedding search functionality

## 📈 Next Steps

1. **Test the AI functionality** - it should work immediately with current page awareness
2. **Add new books** - embeddings will be generated automatically
3. **Configure subscription tiers** if using Stripe
4. **Monitor API usage** and costs
5. **Customize prompts** in `lib/ai/rag.ts` for your specific needs

## 🎉 You're Ready!

The AI functionality now includes:
- ✅ **Automatic embedding generation** during book ingestion
- ✅ **Current page awareness** - AI knows exactly what you're reading
- ✅ **Context-aware responses** based on your current location in the book
- ✅ **Semantic search** within books
- ✅ **Intelligent reading assistance** with literary and knowledge modes

Users can now chat with an AI that truly understands their current reading context!

Enjoy your enhanced reading experience! 📚✨ 