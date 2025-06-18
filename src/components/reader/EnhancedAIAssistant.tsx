'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, User, ThumbsUp, ChevronUp, Zap, ChevronDown, Brain, MessageCircle } from 'lucide-react';
import { getQuickActionButtons, type QuickActionButton, type ReadingMode, type KnowledgeLens } from '@/lib/ai/client-utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'helpful' | 'too_long' | 'too_short' | 'off_topic';
  sessionId?: string;
  messageId?: string;
}

interface ConversationMemory {
  recentTopics: string[];
  userPreferences: {
    responseStyle: 'concise' | 'balanced' | 'detailed' | 'comprehensive';
    complexityLevel: 'beginner' | 'intermediate' | 'advanced';
    interests: string[];
  };
  relationshipContext: {
    conversationCount: number;
    userEngagement: 'low' | 'medium' | 'high';
    satisfactionScore: number;
  };
}

interface EnhancedAIAssistantProps {
  bookId: number;
  currentChunkIndex?: number;
  userTier: 'FREE' | 'PREMIUM' | 'PRO';
  readingMode: ReadingMode;
  knowledgeLens: KnowledgeLens;
  userId: string;
  enableConversationMemory?: boolean;
}

export default function EnhancedAIAssistant({
  bookId,
  currentChunkIndex,
  userTier,
  readingMode,
  knowledgeLens,
  userId,
  enableConversationMemory = true
}: EnhancedAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQuickActionsExpanded, setIsQuickActionsExpanded] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [processingQuickAction, setProcessingQuickAction] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [conversationMemory, setConversationMemory] = useState<ConversationMemory | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showMemoryIndicator, setShowMemoryIndicator] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActionButtons = getQuickActionButtons(readingMode, knowledgeLens);

  const loadConversationHistory = useCallback(async () => {
    if (!enableConversationMemory) return;

    setIsLoadingHistory(true);
    try {
      console.log('[EnhancedAI] Loading conversation history for book:', bookId);

      // First, try to get existing conversation for this book
      const response = await fetch(`/api/ai/enhanced-chat?userId=${userId}&userBookId=${bookId}&limit=30`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          // Convert database messages to UI format
          const convertedMessages: Message[] = data.messages.map((msg: {
            id: string;
            role: string;
            content: string;
            created_at: string;
            user_feedback?: string;
            session_id: string;
          }) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
            feedback: msg.user_feedback,
            sessionId: msg.session_id,
            messageId: msg.id
          }));

          setMessages(convertedMessages);
          setCurrentSessionId(data.sessionId);
          setShowMemoryIndicator(true);
          
          console.log('[EnhancedAI] Loaded conversation history:', convertedMessages.length, 'messages');
        } else {
          // No existing conversation, show personalized welcome
          const welcomeMessage = await generatePersonalizedWelcome();
          setMessages([welcomeMessage]);
        }
      } else {
        // Fallback to basic welcome
        setMessages([{
          id: '1',
          role: 'assistant',
          content: `Hi! I'm Lio 🦁 Ready to explore this book together! I learn your preferences as we chat.`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('[EnhancedAI] Error loading conversation history:', error);
      // Fallback to basic welcome
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Hi! I'm Lio 🦁 Ask me about characters, themes, or plot points!`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [bookId, userId, enableConversationMemory]);

  // Load conversation history on mount
  useEffect(() => {
    if (enableConversationMemory) {
      loadConversationHistory();
    } else {
      // Initialize with basic welcome message if memory is disabled
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Hi! I'm Lio 🦁 Ask me about characters, themes, or plot points!`,
        timestamp: new Date(),
      }]);
    }
  }, [bookId, userId, enableConversationMemory, loadConversationHistory]);

  const generatePersonalizedWelcome = async (): Promise<Message> => {
    const welcomeMessages = [
      `Hello again! I'm Lio 🦁 Ready to continue our literary journey together?`,
      `Welcome back! I'm Lio, your reading companion 🦁 What would you like to explore in this book?`,
      `Hi there! Lio here 🦁 I'm excited to discover new insights with you in this book!`
    ];

    const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

    return {
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: randomWelcome,
      timestamp: new Date(),
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToLastAssistantMessage = () => {
    lastAssistantMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current && lastAssistantMessageRef.current) {
      const container = messagesContainerRef.current;
      const lastMessage = lastAssistantMessageRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const messageRect = lastMessage.getBoundingClientRect();
      
      const isMessageTopVisible = messageRect.top >= containerRect.top;
      const hasScrolledDown = container.scrollTop > 50;
      
      setShowScrollToTop(!isMessageTopVisible && hasScrolledDown);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleSendMessage = async (content: string, quickActionId?: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setProcessingQuickAction(null);

    try {
      const endpoint = enableConversationMemory ? '/api/ai/enhanced-chat' : '/api/ai/chat';
      
      const requestBody = {
        query: content.trim(),
        bookId,
        currentChunkIndex,
        userTier,
        readingMode,
        knowledgeLens,
        userId,
        ...(enableConversationMemory && {
          includeConversationMemory: true,
          sessionId: currentSessionId
        }),
        ...(quickActionId && { quickActionId })
      };

      console.log('[EnhancedAI] Sending request to:', endpoint, 'with memory:', enableConversationMemory);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        sessionId: data.sessionId,
        messageId: data.messageId
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation context if available
      if (data.conversationContext) {
        setConversationMemory(data.conversationContext);
        setShowMemoryIndicator(true);
      }

      // Update session ID if new session was created
      if (data.sessionId && data.sessionId !== currentSessionId) {
        setCurrentSessionId(data.sessionId);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `*Lio stretches and shakes his mane* 

Hmm, it seems I'm having a bit of trouble connecting to my vast library of knowledge right now. Even the wisest lions need a moment to regroup sometimes! 

Please try your question again in a moment, and I'll be ready to help you explore this wonderful book together. 🦁`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setProcessingQuickAction(null);
    }
  };

  const handleQuickAction = (button: QuickActionButton) => {
    setProcessingQuickAction(button.id);
    handleSendMessage(button.prompt, button.id);
  };

  const handleFeedback = async (messageId: string, feedback: Message['feedback']) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );

    // Send feedback to backend for learning profile updates
    try {
      const endpoint = enableConversationMemory ? '/api/ai/enhanced-feedback' : '/api/ai/feedback';
      
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: messages.find(m => m.id === messageId)?.messageId || messageId,
          feedback,
          userId,
          sessionId: currentSessionId
        }),
      });
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // Organize quick actions by category for better UX
  const organizedQuickActions = quickActionButtons.reduce((acc, button) => {
    const category = button.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(button);
    return acc;
  }, {} as Record<string, QuickActionButton[]>);

  // Improve category display names
  const categoryDisplayNames: Record<string, string> = {
    'summary': '📝 Summary & Overview',
    'analysis': '🔍 Analysis & Insights', 
    'character': '👥 Characters & People',
    'context': '🌍 Context & Background',
    'learning': '🎓 Learning & Growth',
    'creative': '🎨 Creative & Interpretation',
    'discussion': '💬 Discussion & Questions',
    'connections': '🔗 Connections & Links'
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Enhanced Header with Memory Indicator */}
      {enableConversationMemory && (
        <div className="px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Intelligent Memory Active
              </span>
              {showMemoryIndicator && conversationMemory && (
                <div className="flex items-center space-x-1 text-xs text-amber-600">
                  <MessageCircle className="w-3 h-3" />
                  <span>{conversationMemory.relationshipContext.conversationCount} exchanges</span>
                </div>
              )}
            </div>
            {isLoadingHistory && (
              <div className="flex items-center space-x-1 text-xs text-amber-600">
                <div className="animate-spin w-3 h-3 border border-amber-600 border-t-transparent rounded-full"></div>
                <span>Loading memory...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-8"
        onScroll={handleScroll}
      >
        {messages.map((message, index) => {
          const isLastAssistantMessage = message.role === 'assistant' && 
            index === messages.map(m => m.role).lastIndexOf('assistant');
          
          return (
            <div
              key={message.id}
              ref={isLastAssistantMessage ? lastAssistantMessageRef : null}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[95%] rounded-xl px-6 py-5 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-900 border border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-4">
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mt-1">
                      <span className="text-xl">🦁</span>
                    </div>
                  )}
                  {message.role === 'user' && (
                    <User className="w-6 h-6 mt-1 text-white flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="whitespace-pre-wrap text-lg leading-relaxed font-medium">
                      {message.content}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm opacity-70 font-medium">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                        {enableConversationMemory && message.sessionId && (
                          <span className="ml-2 text-sm opacity-60">
                            📝 Remembered
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Feedback buttons for assistant messages */}
                {message.role === 'assistant' && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleFeedback(message.id, 'helpful')}
                        className={`p-2 rounded-lg transition-colors ${
                          message.feedback === 'helpful'
                            ? 'bg-green-100 text-green-600'
                            : 'hover:bg-gray-100 text-gray-500'
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, 'too_long')}
                        className={`p-2 rounded-lg transition-colors text-xs ${
                          message.feedback === 'too_long'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'hover:bg-gray-100 text-gray-500'
                        }`}
                        title="Too long"
                      >
                        Long
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, 'too_short')}
                        className={`p-2 rounded-lg transition-colors text-xs ${
                          message.feedback === 'too_short'
                            ? 'bg-blue-100 text-blue-600'
                            : 'hover:bg-gray-100 text-gray-500'
                        }`}
                        title="Too short"
                      >
                        Short
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, 'off_topic')}
                        className={`p-2 rounded-lg transition-colors text-xs ${
                          message.feedback === 'off_topic'
                            ? 'bg-red-100 text-red-600'
                            : 'hover:bg-gray-100 text-gray-500'
                        }`}
                        title="Off topic"
                      >
                        Off topic
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <Zap className="w-4 h-4 mr-2 text-amber-500" />
            Quick Actions
            {enableConversationMemory && conversationMemory && (
              <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                Personalized
              </span>
            )}
          </h3>
          <button
            onClick={() => setIsQuickActionsExpanded(!isQuickActionsExpanded)}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {isQuickActionsExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        <div className={`grid gap-2 transition-all duration-200 ${
          isQuickActionsExpanded ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
        }`}>
          {Object.entries(organizedQuickActions).map(([category, buttons]) => (
            <div key={category} className={isQuickActionsExpanded ? 'space-y-2' : ''}>
              {isQuickActionsExpanded && (
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {categoryDisplayNames[category] || category}
                </h4>
              )}
              <div className={`grid gap-2 ${isQuickActionsExpanded ? 'grid-cols-1' : 'grid-cols-1'}`}>
                {buttons.slice(0, isQuickActionsExpanded ? buttons.length : 1).map((button) => (
                  <button
                    key={button.id}
                    onClick={() => handleQuickAction(button)}
                    disabled={isLoading}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                      processingQuickAction === button.id
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center space-x-2">
                      {processingQuickAction === button.id && (
                        <div className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      <span className="truncate">{button.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToLastAssistantMessage}
          className="absolute right-6 bottom-32 p-3 bg-amber-500 text-white rounded-full shadow-lg hover:bg-amber-600 transition-colors z-10"
          title="Scroll to Lio's latest response"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      {/* Input Area */}
      <div className="p-6 border-t border-gray-200 bg-white">
        <div className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Lio anything about this book..."
            disabled={isLoading}
            className="flex-1 px-5 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed shadow-sm placeholder-gray-400"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            title="Send message (Enter)"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 font-medium">
            {enableConversationMemory 
              ? "Lio learns your reading style and gets wiser with each conversation 🦁" 
              : "Ask Lio about characters, themes, or plot points 🦁"
            }
          </p>
          <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-400">
            <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs">Enter</kbd>
            <span>to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}
