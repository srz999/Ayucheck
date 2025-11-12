'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function GraphRAGChat() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/graphrag',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `🔗 **Welcome to Graph RAG - Knowledge Graph Powered Ayurvedic Assistant**

I use a knowledge graph to understand relationships between Ayurvedic concepts! Unlike traditional RAG, I can:

• **Entity Recognition**: Identify herbs, diseases, properties, and doshas
• **Relationship Mapping**: Understand how treatments relate to diseases
• **Graph Traversal**: Find connected concepts and related information
• **Contextual Understanding**: Leverage the structure of Ayurvedic knowledge

**Try asking about:**
- "What herbs treat digestive disorders?"
- "Tell me about Amalaki and what it treats"
- "What are the properties of anti-inflammatory herbs?"
- "Herbs that balance Vata dosha"
- "Relationships between Triphala and digestive health"

*This is a Graph RAG system - entities and their relationships are extracted from the Ayurvedic Pharmacopoeia.*

What would you like to explore?`
      }
    ]
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
      const form = e.currentTarget.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  };

  const suggestions = [
    "What herbs treat digestive disorders?",
    "Tell me about Amalaki and what it treats",
    "Properties of anti-inflammatory herbs",
    "Herbs that balance Vata dosha",
    "Relationships between herbs and diseases"
  ];

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4 text-white">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">🔗</span>
            <h1 className="text-xl font-semibold">Graph RAG - Knowledge Graph Assistant</h1>
            <span className="text-2xl">🧬</span>
          </div>
          <p className="text-center text-purple-100 text-sm mt-1">
            Entity & Relationship Aware Ayurvedic Knowledge Base
          </p>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-25 to-indigo-25">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-br-sm'
                    : 'bg-gradient-to-r from-purple-100 to-indigo-50 text-gray-800 border border-purple-200 rounded-bl-sm'
                }`}
              >
                <div
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-100 to-indigo-50 border border-purple-200 rounded-bl-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="px-4 py-3 border-t border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
            <p className="text-xs font-medium text-purple-700 mb-2">💡 Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    handleInputChange({ target: { value: suggestion } } as any);
                  }}
                  className="text-xs px-3 py-1.5 bg-white hover:bg-purple-50 border border-purple-200 rounded-full text-purple-700 hover:text-purple-900 transition-colors shadow-sm hover:shadow-md"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="border-t border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Ask about Ayurvedic entities and their relationships..."
              disabled={isLoading}
              className="flex-1 bg-white border-purple-200 focus:border-purple-500 focus:ring-purple-500"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching Graph...
                </span>
              ) : (
                'Send'
              )}
            </Button>
          </form>
          <p className="text-xs text-purple-600 mt-2 text-center">
            🔗 Powered by Knowledge Graph • Entities & Relationships Extracted from Ayurvedic Pharmacopoeia
          </p>
        </div>

      </div>
    </div>
  );
}
