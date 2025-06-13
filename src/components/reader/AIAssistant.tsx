'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, ThumbsUp, ThumbsDown, MoreHorizontal, ChevronUp, Zap } from 'lucide-react';
import { getQuickActionButtons, type QuickActionButton, type ReadingMode, type KnowledgeLens } from '@/lib/ai/client-utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'helpful' | 'too_long' | 'too_short' | 'off_topic';
}

interface AIAssistantProps {
  bookId: number;
  currentChunkIndex?: number;
  userTier: 'FREE' | 'PREMIUM' | 'PRO';
  readingMode: ReadingMode;
  knowledgeLens: KnowledgeLens;
  userId: string;
}

export default function AIAssistant({
  bookId,
  currentChunkIndex,
  userTier,
  readingMode,
  knowledgeLens,
  userId
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm Lio 🦁 Ask me about characters, themes, or plot points!`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isQuickActionsExpanded, setIsQuickActionsExpanded] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActionButtons = getQuickActionButtons(readingMode, knowledgeLens);

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
      
      // Show button if the top of the last assistant message is above the visible area
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

  const handleSendMessage = async (content: string) => {
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

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content.trim(),
          bookId,
          currentChunkIndex,
          userTier,
          readingMode,
          knowledgeLens,
          userId,
        }),
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
      };

      setMessages(prev => [...prev, assistantMessage]);
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
    }
  };

  const handleQuickAction = (button: QuickActionButton) => {
    handleSendMessage(button.prompt);
  };

  const handleFeedback = async (messageId: string, feedback: Message['feedback']) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );

    // Send feedback to backend for learning profile updates
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          feedback,
          userId,
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

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
        onScroll={handleScroll}
      >
        {messages.map((message, index) => {
          // Check if this is the last assistant message
          const isLastAssistantMessage = message.role === 'assistant' && 
            index === messages.map(m => m.role).lastIndexOf('assistant');
          
          return (
            <div
              key={message.id}
              ref={isLastAssistantMessage ? lastAssistantMessageRef : null}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-5 py-4 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-900 border border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-4">
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mt-1">
                      <span className="text-lg">🦁</span>
                    </div>
                  )}
                  {message.role === 'user' && (
                    <User className="w-5 h-5 mt-1 text-white flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="whitespace-pre-wrap text-base leading-relaxed font-medium">
                      {message.content}
                    </div>
                    <div className="text-xs opacity-70 mt-3 font-medium">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Feedback buttons for assistant messages */}
                {message.role === 'assistant' && (
                  <div className="flex items-center justify-end space-x-3 mt-4 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleFeedback(message.id, 'helpful')}
                      className={`p-2 rounded-full transition-all duration-200 ${
                        message.feedback === 'helpful'
                          ? 'bg-green-100 text-green-600 shadow-sm'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title="Helpful"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, 'too_long')}
                      className={`p-2 rounded-full transition-all duration-200 ${
                        message.feedback === 'too_long'
                          ? 'bg-orange-100 text-orange-600 shadow-sm'
                          : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                      }`}
                      title="Too long"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, 'too_short')}
                      className={`p-2 rounded-full transition-all duration-200 ${
                        message.feedback === 'too_short'
                          ? 'bg-blue-100 text-blue-600 shadow-sm'
                          : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title="Too short"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl px-5 py-4 max-w-[90%] shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-lg">🦁</span>
                </div>
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToLastAssistantMessage}
          className="absolute top-4 right-4 z-10 p-3 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50"
          title="Scroll to top of Lio's response"
        >
          <ChevronUp className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Floating Quick Actions Button - Shows when quick actions are hidden */}
      {!showQuickActions && messages.length > 2 && (
        <button
          onClick={() => setIsQuickActionsExpanded(!isQuickActionsExpanded)}
          className="absolute top-4 left-4 z-10 p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:from-amber-600 hover:to-orange-600"
          title="Quick Actions"
        >
          <Zap className="w-5 h-5" />
        </button>
      )}

      {/* Expandable Quick Actions Panel */}
      {isQuickActionsExpanded && (
        <div className="absolute top-16 left-4 right-4 z-10 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-amber-500" />
              Quick Actions
            </h3>
            <button
              onClick={() => setIsQuickActionsExpanded(false)}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {quickActionButtons.map((button) => (
              <button
                key={button.id}
                onClick={() => {
                  handleQuickAction(button);
                  setIsQuickActionsExpanded(false);
                }}
                disabled={isLoading}
                className="flex items-center space-x-3 p-3 text-left bg-gray-50 hover:bg-amber-50 hover:border-amber-200 border border-gray-200 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-base flex-shrink-0">{button.icon}</span>
                <span className="text-gray-700 font-medium text-sm leading-tight">{button.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Initial Quick Action Buttons - Show for first-time users */}
      {showQuickActions && messages.length <= 2 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-700 font-semibold flex items-center">
              <Zap className="w-4 h-4 mr-2 text-amber-500" />
              Quick Actions:
            </p>
            <button
              onClick={() => setShowQuickActions(false)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              title="Hide quick actions (you can access them anytime with the ⚡ button)"
            >
              Hide
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActionButtons.slice(0, 4).map((button) => (
              <button
                key={button.id}
                onClick={() => handleQuickAction(button)}
                disabled={isLoading}
                className="flex items-center space-x-3 p-4 text-left bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-amber-300 hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg flex-shrink-0">{button.icon}</span>
                <span className="text-gray-700 font-medium text-sm leading-tight">{button.label}</span>
              </button>
            ))}
          </div>
          {quickActionButtons.length > 4 && (
            <button
              onClick={() => setIsQuickActionsExpanded(true)}
              className="w-full mt-3 p-3 text-sm text-amber-600 hover:text-amber-700 transition-colors font-medium flex items-center justify-center"
            >
              <Zap className="w-4 h-4 mr-2" />
              Show all {quickActionButtons.length} quick actions...
            </button>
          )}
        </div>
      )}

      {/* Input */}
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
            className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-gray-500 font-medium">
            Lio learns your reading style and gets wiser with each conversation 🦁
          </p>
          {!showQuickActions && messages.length > 2 && (
            <button
              onClick={() => setIsQuickActionsExpanded(!isQuickActionsExpanded)}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center transition-colors"
            >
              <Zap className="w-3 h-3 mr-1" />
              Quick Actions
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 