'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AyurvedicPineconeChat() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [pineconeInfo, setPineconeInfo] = useState<any>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/embedpinecone',
    initialMessages: [{
      id: 'welcome',
      role: 'assistant',
      content: `🌲 **Welcome to Pinecone-Powered Ayurvedic Knowledge Assistant**

I'm enhanced with **Pinecone vector database** for cloud-scale semantic understanding and enterprise-grade knowledge retrieval. This advanced system offers:

• **🚀 Enterprise Scale**: Pinecone's cloud infrastructure for unlimited scalability
• **⚡ Blazing Performance**: Globally distributed vector search with sub-100ms latency  
• **🧠 Advanced AI**: State-of-the-art embeddings with semantic understanding
• **🔍 Intelligent Filtering**: Production-ready metadata queries and hybrid search
• **📚 Comprehensive Knowledge**: Full Ayurvedic Pharmacopoeia with 220+ documented entries
• **🌐 Global Availability**: Cloud-hosted with 99.9% uptime guarantee

*Powered by Pinecone Cloud Vector Database + OpenAI Embeddings for enterprise-grade accuracy*

What Ayurvedic wisdom would you like to explore today?`
    }]
  });

  // Check Pinecone connection status on mount
  useEffect(() => {
    checkPineconeHealth();
  }, []);

  const checkPineconeHealth = async () => {
    try {
      const response = await fetch('/api/embedpinecone', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPineconeInfo(data);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Pinecone health check failed:', error);
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
      case 'connected': return `✅ Pinecone Connected (${pineconeInfo?.vectorCount || 0} vectors)`;
      case 'disconnected': return '❌ Pinecone Disconnected';
      default: return '⏳ Checking Connection...';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header with Pinecone status */}
      <div className="bg-white border-b border-green-200 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-900 flex items-center gap-2">
              🌲 Ayurvedic Knowledge Assistant
              <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                Pinecone Cloud
              </span>
            </h1>
            <p className="text-sm text-green-700 mt-1">
              Powered by enterprise-grade cloud vector search
            </p>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            {pineconeInfo && (
              <div className="text-xs text-gray-600 mt-1">
                Index: {pineconeInfo.indexName}
              </div>
            )}
            <Button
              onClick={checkPineconeHealth}
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
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-900 border border-green-200'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                  {message.role === 'assistant' && (
                    <div className="mt-2 pt-2 border-t border-green-100 text-xs text-green-600">
                      🌲 Powered by Pinecone Cloud Vector Search
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-4 rounded-lg bg-white border border-green-200 shadow-sm">
                  <div className="flex items-center space-x-2 text-green-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    <span className="text-sm">
                      🌲 Searching Pinecone cloud database...
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
      <div className="border-t border-green-200 bg-white p-4 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <Input
              value={input}
              placeholder={
                connectionStatus === 'connected'
                  ? "Ask about Ayurvedic herbs, treatments, or dosha recommendations..."
                  : "Please check Pinecone connection before asking questions..."
              }
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading || connectionStatus !== 'connected'}
              className="flex-1 border-green-300 focus:border-green-500 focus:ring-green-500"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || connectionStatus !== 'connected'}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Searching...</span>
                </div>
              ) : (
                '🌲 Ask Pinecone'
              )}
            </Button>
          </div>
        </form>
        
        {/* Connection Warning */}
        {connectionStatus === 'disconnected' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700">
              <strong>⚠️ Pinecone Connection Required:</strong> Please ensure your Pinecone API key is configured
            </div>
            <div className="text-xs text-red-600 mt-1 font-mono">
              Add <code>PINECONE_API_KEY</code> to your .env.local file
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
              className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}