'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AyurvedicQdrantChat() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [qdrantInfo, setQdrantInfo] = useState<any>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/embedqdrant',
    initialMessages: [{
      id: 'welcome',
      role: 'assistant',
      content: `🚀 **Welcome to Qdrant-Powered Ayurvedic Knowledge Assistant**

I'm enhanced with **Qdrant vector database** for superior semantic understanding and lightning-fast knowledge retrieval. This cutting-edge system offers:

• **🎯 Precision Search**: Qdrant's advanced vector similarity for highly relevant results
• **⚡ Lightning Speed**: Optimized indexing and retrieval with millisecond response times  
• **🧠 Deep Understanding**: Semantic embeddings that capture meaning beyond keywords
• **🔍 Smart Filtering**: Advanced metadata queries by dosha, herb type, or condition
• **📚 Comprehensive Knowledge**: Full Ayurvedic Pharmacopoeia with 220+ documented entries
• **🔄 Real-time Sync**: Live connection to continuously updated knowledge base

*Powered by Qdrant Vector Database + OpenAI Embeddings for unmatched accuracy*

What Ayurvedic wisdom would you like to explore today?`
    }]
  });

  // Check Qdrant connection status on mount
  useEffect(() => {
    checkQdrantHealth();
  }, []);

  const checkQdrantHealth = async () => {
    try {
      const response = await fetch('/api/embedqdrant', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQdrantInfo(data);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Qdrant health check failed:', error);
      setConnectionStatus('disconnected');
    }
  };

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

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return `✅ Qdrant Connected (${qdrantInfo?.documentCount || 0} docs)`;
      case 'disconnected': return '❌ Qdrant Disconnected';
      default: return '⏳ Checking Connection...';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header with Qdrant status */}
      <div className="bg-white border-b border-amber-200 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              🧬 Ayurvedic Knowledge Assistant
              <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                Qdrant Enhanced
              </span>
            </h1>
            <p className="text-sm text-amber-700 mt-1">
              Powered by advanced vector search and semantic understanding
            </p>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            {qdrantInfo && (
              <div className="text-xs text-gray-600 mt-1">
                Collection: {qdrantInfo.collection}
              </div>
            )}
            <Button
              onClick={checkQdrantHealth}
              variant="outline"
              size="sm"
              className="mt-2 text-xs"
              disabled={connectionStatus === 'checking'}
            >
              {connectionStatus === 'checking' ? '⏳' : '🔄'} Refresh Status
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-3xl p-4 rounded-lg shadow-sm ${
                    message.role === 'user'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-gray-900 border border-amber-200'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                  {message.role === 'assistant' && (
                    <div className="mt-2 pt-2 border-t border-amber-100 text-xs text-amber-600">
                      🔍 Powered by Qdrant Vector Search
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-4 rounded-lg bg-white border border-amber-200 shadow-sm">
                  <div className="flex items-center space-x-2 text-amber-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                    <span className="text-sm">
                      🧠 Searching Qdrant knowledge base...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="border-t border-amber-200 bg-white p-4 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <Input
              value={input}
              placeholder={
                connectionStatus === 'connected'
                  ? "Ask about Ayurvedic herbs, treatments, or dosha recommendations..."
                  : "Please check Qdrant connection before asking questions..."
              }
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading || connectionStatus !== 'connected'}
              className="flex-1 border-amber-300 focus:border-amber-500 focus:ring-amber-500"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || connectionStatus !== 'connected'}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Searching...</span>
                </div>
              ) : (
                '🔍 Ask Qdrant'
              )}
            </Button>
          </div>
        </form>
        
        {/* Connection Warning */}
        {connectionStatus === 'disconnected' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700">
              <strong>⚠️ Qdrant Connection Required:</strong> Please ensure Qdrant is running on localhost:6333
            </div>
            <div className="text-xs text-red-600 mt-1 font-mono">
              Run: <code>docker run -p 6333:6333 -p 6334:6334 -v $(pwd)/qdrant_storage:/qdrant/storage:z qdrant/qdrant:latest</code>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <div className="text-gray-600">💡 Try asking:</div>
          {[
            "What herbs help with Vata imbalance?",
            "Benefits of Ashwagandha",
            "Ayurvedic treatments for digestion",
            "Herbs for stress and anxiety"
          ].map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => {
                handleInputChange({ target: { value: suggestion } } as any);
              }}
              disabled={connectionStatus !== 'connected'}
              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}