'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AyurvedicEmbeddingChat() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/embedyurveda',
    initialMessages: [{
      id: 'welcome',
      role: 'assistant',
      content: `🧠 **Welcome to Advanced Ayurvedic Knowledge Assistant**

I use semantic understanding and vector embeddings to provide more intelligent responses about Ayurvedic medicine. This advanced system can:

• **Understand Context**: Find conceptually related information, not just keyword matches
• **Cross-Reference**: Connect related herbs, treatments, and conditions
• **Deep Search**: Discover hidden connections in the Ayurvedic Pharmacopoeia
• **Contextual Memory**: Build on our conversation for better recommendations

*Enhanced with vector embeddings for superior knowledge retrieval*

What Ayurvedic topic would you like to explore?`
    }]
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Trigger form submission
      const form = e.currentTarget.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  };

  // Enhanced suggestions with semantic understanding
  const suggestions = [
    "Find herbs similar to Ashwagandha for stress",
    "Compare different Guggulu preparations",
    "Herbs for Pitta-related disorders",
    "Rasayana formulations for longevity",
    "Anti-inflammatory Ayurvedic medicines"
  ];

  const formatMessage = (content: string) => {
    // Convert markdown-like formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">🧠</span>
            <h1 className="text-xl font-semibold">AI-Enhanced Ayurvedic Assistant</h1>
            <span className="text-2xl">⚡</span>
          </div>
          <p className="text-center text-indigo-100 text-sm mt-1">
            Semantic Search • Vector Embeddings • Intelligent Retrieval
          </p>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-indigo-25 to-purple-25">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-sm'
                    : 'bg-gradient-to-r from-indigo-100 to-purple-50 text-gray-800 border border-indigo-200 rounded-bl-sm'
                }`}
              >
                <div 
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-indigo-100 to-purple-50 border border-indigo-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                <div className="flex items-center space-x-2 text-indigo-600">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">Searching semantic knowledge...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-indigo-100">
            <p className="text-sm text-indigo-700 font-medium mb-2">💡 Try these semantic search examples:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const form = document.querySelector('form') as HTMLFormElement;
                    const input = form?.querySelector('input[type="text"]') as HTMLInputElement;
                    if (input) {
                      input.value = suggestion;
                      // Trigger input change event
                      const event = new Event('input', { bubbles: true });
                      input.dispatchEvent(event);
                      // Submit the form
                      form.dispatchEvent(new Event('submit', { bubbles: true }));
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-full border border-indigo-200 transition-colors duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="p-4 bg-white border-t border-indigo-100">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Ask about Ayurvedic herbs, treatments, or concepts..."
              className="flex-1 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400 rounded-xl px-4 py-2 text-sm"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl px-6 py-2 text-sm font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Thinking...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <span>Send</span>
                  <span>🚀</span>
                </div>
              )}
            </Button>
          </form>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            🧠 Enhanced with AI embeddings for intelligent semantic search • 
            <span className="text-indigo-600 font-medium"> Vector-powered knowledge retrieval</span>
          </div>
        </div>
      </div>
    </div>
  );
}