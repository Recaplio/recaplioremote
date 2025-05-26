'use client';

import { useState, useRef, useEffect } from 'react';
import { type ChatMessage, type ReadingMode, type KnowledgeLens } from '@/lib/ai/rag';

interface AIAssistantProps {
  bookId: number;
  currentChunkIndex?: number;
  readingMode: ReadingMode;
  knowledgeLens: KnowledgeLens;
  onReadingModeChange: (mode: ReadingMode) => void;
  onKnowledgeLensChange: (lens: KnowledgeLens) => void;
}

interface AIResponse {
  response: string;
  userTier: string;
  timestamp: string;
}

export default function AIAssistant({
  bookId,
  currentChunkIndex,
  readingMode,
  knowledgeLens,
  onReadingModeChange,
  onKnowledgeLensChange,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your AI reading assistant. I'm currently in ${readingMode} mode with ${knowledgeLens} lens. How can I help you understand this book better?`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          bookId,
          currentChunkIndex,
          readingMode,
          knowledgeLens,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const aiResponse: AIResponse = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse.response,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPlaceholderText = () => {
    if (readingMode === 'fiction') {
      return knowledgeLens === 'literary' 
        ? "Ask about characters, themes, symbolism..."
        : "Ask about plot, narrative structure...";
    } else {
      return knowledgeLens === 'knowledge'
        ? "Ask about concepts, arguments, frameworks..."
        : "Ask about writing style, rhetoric...";
    }
  };

  return (
    <div className="w-full md:w-1/3 p-3 sm:p-4 flex flex-col bg-white border-t md:border-t-0 md:border-l border-gray-200 md:h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
        <div className="flex items-center space-x-1 border border-gray-300 rounded-full p-0.5 text-xs flex-shrink-0">
          <button 
            onClick={() => onReadingModeChange('fiction')}
            className={`px-2.5 sm:px-3 py-1 rounded-full transition-all ${
              readingMode === 'fiction' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            Fiction
          </button>
          <button 
            onClick={() => onReadingModeChange('non-fiction')}
            className={`px-2.5 sm:px-3 py-1 rounded-full transition-all ${
              readingMode === 'non-fiction' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            Non-Fiction
          </button>
        </div>
      </div>

      {/* Knowledge Lens Toggle */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center space-x-1 border border-gray-300 rounded-full p-0.5 text-xs">
          <button 
            onClick={() => onKnowledgeLensChange('literary')}
            className={`px-2.5 sm:px-3 py-1 rounded-full transition-all ${
              knowledgeLens === 'literary' 
                ? 'bg-green-600 text-white shadow-sm' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            Literary
          </button>
          <button 
            onClick={() => onKnowledgeLensChange('knowledge')}
            className={`px-2.5 sm:px-3 py-1 rounded-full transition-all ${
              knowledgeLens === 'knowledge' 
                ? 'bg-green-600 text-white shadow-sm' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            Knowledge
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow bg-gray-50 p-2 sm:p-3 rounded-md overflow-y-auto mb-3 text-sm space-y-3 min-h-[200px] md:min-h-0">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`p-2 rounded-md max-w-[85%] ${
              message.role === 'assistant' 
                ? 'bg-indigo-50 text-indigo-800 self-start' 
                : 'bg-gray-200 text-gray-800 self-end ml-auto'
            }`}
          >
            <span className={`font-semibold block ${message.role === 'user' ? 'text-right' : ''}`}>
              {message.role === 'assistant' ? 'AI' : 'You'}:
            </span>
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="bg-indigo-50 text-indigo-800 p-2 rounded-md max-w-[85%]">
            <span className="font-semibold block">AI:</span>
            <div className="flex items-center space-x-1">
              <div className="animate-pulse">Thinking...</div>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="mt-auto flex-shrink-0">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-full p-2 border border-gray-300 rounded-md mb-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          rows={3}
          placeholder={getPlaceholderText()}
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={!inputValue.trim() || isLoading}
          className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
} 