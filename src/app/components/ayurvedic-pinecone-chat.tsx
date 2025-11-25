'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MarkdownRenderer from './markdown-renderer';

export default function AyurvedicPineconeChat() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [pineconeInfo, setPineconeInfo] = useState<any>(null);
  const [useHybridRAG, setUseHybridRAG] = useState<boolean>(true); // Default to Hybrid RAG
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/embedpinecone',
    body: {
      useHybridSearch: useHybridRAG
    },
    initialMessages: [{
      id: 'welcome',
      role: 'assistant',
      content: `# 🌲 Welcome to Pinecone-Powered Ayurvedic Knowledge Assistant

I'm enhanced with **Pinecone vector database** for cloud-scale semantic understanding and enterprise-grade knowledge retrieval. This advanced system offers:

## ✨ Key Features

- **🚀 Enterprise Scale**: Pinecone's cloud infrastructure for unlimited scalability
- **⚡ Blazing Performance**: Globally distributed vector search with sub-100ms latency  
- **🧠 Advanced AI**: State-of-the-art embeddings with semantic understanding
- **🔍 Intelligent Filtering**: Production-ready metadata queries and hybrid search
- **📚 Comprehensive Knowledge**: Full Ayurvedic data with 300+ documented entries
- **🌐 Global Availability**: Cloud-hosted with 99.9% uptime guarantee

## 📖 Available Knowledge Bases

- **Ayurvedic Therapies**: Therapeutic recommendations and treatment approaches for various illnesses, including classical formulations and Panchakarma procedures
- **Skin Diseases**: Ayurvedic diet & lifestyle guidelines for skin health
- **Mental Health**: Psychiatric disorders and mental wellness in Ayurveda


---

*Powered by Pinecone Cloud Vector Database + OpenAI Embeddings for enterprise-grade accuracy*

**What Ayurvedic wisdom would you like to explore today?**`
    }]
  });

  // Check Pinecone connection status on mount and when endpoint changes
  useEffect(() => {
    checkPineconeHealth();
  }, [useHybridRAG]);

  const checkPineconeHealth = async () => {
    try {
      const endpoint = '/api/embedpinecone';
      const response = await fetch(endpoint, {
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
    const mode = useHybridRAG ? 'Hybrid RAG' : 'Vector Only';
    switch (connectionStatus) {
      case 'connected': return `✅ ${mode} Connected (${pineconeInfo?.vectorCount || 0} vectors)`;
      case 'disconnected': return `❌ ${mode} Disconnected`;
      default: return '⏳ Checking Connection...';
    }
  };

  const handleToggleRAG = () => {
    const newMode = !useHybridRAG;
    setUseHybridRAG(newMode);
    
    // Update welcome message based on mode
    const welcomeMessage = newMode ? getHybridWelcomeMessage() : getVectorOnlyWelcomeMessage();
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessage
    }]);
  };

  const getHybridWelcomeMessage = () => `# 🚀 Welcome to Hybrid RAG Ayurvedic Knowledge Assistant

I'm powered by **Hybrid Retrieval-Augmented Generation** combining:
1. **🌲 Pinecone Vector Search** (70%) - Semantic understanding
2. **📚 BM25 Keyword Search** (30%) - Precise term matching

## ✨ Hybrid RAG Advantages

- **🎯 Best of Both Worlds**: Semantic understanding + exact term matching
- **🔍 Smart Query Processing**: Automatic classification and expansion (2-3 variants)
- **📊 Intelligent Scoring**: Weighted combination with deduplication
- **🛡️ Robust Fallback**: Works even if Pinecone is unavailable
- **⚡ Namespace Targeting**: 40-60% cost reduction via smart routing
- **🧠 Enhanced Accuracy**: Combines vector similarity with BM25 ranking

## 📖 Available Knowledge Bases

- **Ayurvedic Therapies**: Therapeutic recommendations and treatment approaches
- **Skin Diseases**: Ayurvedic diet & lifestyle guidelines for skin health
- **Mental Health**: Psychiatric disorders and mental wellness in Ayurveda

---

*Powered by Pinecone Cloud + BM25 Hybrid Search for maximum accuracy*

**What Ayurvedic wisdom would you like to explore today?**`;

  const getVectorOnlyWelcomeMessage = () => `# 🌲 Welcome to Pinecone-Powered Ayurvedic Knowledge Assistant

I'm enhanced with **Pinecone vector database** for cloud-scale semantic understanding and enterprise-grade knowledge retrieval.

## ✨ Key Features

- **🚀 Enterprise Scale**: Pinecone's cloud infrastructure for unlimited scalability
- **⚡ Blazing Performance**: Globally distributed vector search with sub-100ms latency  
- **🧠 Advanced AI**: State-of-the-art embeddings with semantic understanding
- **🔍 Intelligent Filtering**: Production-ready metadata queries and hybrid search
- **📚 Comprehensive Knowledge**: Full Ayurvedic data with 300+ documented entries
- **🌐 Global Availability**: Cloud-hosted with 99.9% uptime guarantee

## 📖 Available Knowledge Bases

- **Ayurvedic Therapies**: Therapeutic recommendations and treatment approaches
- **Skin Diseases**: Ayurvedic diet & lifestyle guidelines for skin health
- **Mental Health**: Psychiatric disorders and mental wellness in Ayurveda

---

*Powered by Pinecone Cloud Vector Database + OpenAI Embeddings for enterprise-grade accuracy*

**What Ayurvedic wisdom would you like to explore today?**`;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-green-50 to-emerald-50" data-testid="chat-container">
      {/* Header with Pinecone status */}
      <div className="bg-white border-b border-green-200 p-4 shadow-sm" data-testid="chat-header">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-900 flex items-center gap-2">
              {useHybridRAG ? '🚀' : '🌲'} Ayurvedic Knowledge Assistant
              <span className={`text-sm px-2 py-1 rounded-full font-medium ${
                useHybridRAG 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {useHybridRAG ? 'Hybrid RAG' : 'Pinecone Cloud'}
              </span>
            </h1>
            <p className="text-sm text-green-700 mt-1">
              {useHybridRAG 
                ? 'Vector Search (70%) + BM25 Keyword (30%)' 
                : 'Powered by enterprise-grade cloud vector search'}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            {pineconeInfo && (
              <div className="text-xs text-gray-600 mt-1">
                Index: {pineconeInfo.indexName}
                {useHybridRAG && pineconeInfo.ragMode && (
                  <span className="ml-2 text-purple-600">
                    • Mode: {pineconeInfo.ragMode}
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Button
                onClick={handleToggleRAG}
                variant={useHybridRAG ? 'default' : 'outline'}
                size="sm"
                className={`text-xs ${
                  useHybridRAG 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'border-purple-300 text-purple-700 hover:bg-purple-50'
                }`}
              >
                {useHybridRAG ? '🚀 Hybrid RAG' : '🌲 Vector Only'}
              </Button>
              <Button
                onClick={checkPineconeHealth}
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={connectionStatus === 'checking'}
              >
                {connectionStatus === 'checking' ? '⏳' : '🔄'} Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4" data-testid="chat-messages">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
                data-testid={`message-${message.role}`}
              >
                <div
                  className={`max-w-3xl p-4 rounded-lg shadow-sm ${
                    message.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-900 border border-green-200'
                  }`}
                >
                  {message.role === 'user' ? (
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  ) : (
                    <MarkdownRenderer 
                      content={message.content}
                      className="text-sm"
                    />
                  )}
                  {message.role === 'assistant' && message.id !== 'welcome' && (
                    <div className={`mt-2 pt-2 border-t text-xs ${
                      useHybridRAG 
                        ? 'border-purple-100 text-purple-600' 
                        : 'border-green-100 text-green-600'
                    }`}>
                      {useHybridRAG 
                        ? '🚀 Powered by Hybrid RAG (Vector 70% + BM25 30%)' 
                        : '🌲 Powered by Pinecone Cloud Vector Search'}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start" data-testid="loading-indicator">
                <div className="max-w-3xl p-4 rounded-lg bg-white border border-green-200 shadow-sm">
                  <div className={`flex items-center space-x-2 ${useHybridRAG ? 'text-purple-600' : 'text-green-600'}`}>
                    <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${useHybridRAG ? 'border-purple-600' : 'border-green-600'}`}></div>
                    <span className="text-sm">
                      {useHybridRAG 
                        ? '🚀 Running hybrid search (vector + BM25 keyword)...' 
                        : '🌲 Searching Pinecone cloud database...'}
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
      <div className="border-t border-green-200 bg-white p-4 shadow-lg" data-testid="chat-input-form">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <Input
              value={input}
              placeholder={
                connectionStatus === 'connected'
                  ? useHybridRAG
                    ? "Ask about Ayurvedic herbs, treatments, or dosha recommendations... (Hybrid search active)"
                    : "Ask about Ayurvedic herbs, treatments, or dosha recommendations..."
                  : "Please check connection before asking questions..."
              }
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading || connectionStatus !== 'connected'}
              className={`flex-1 ${useHybridRAG ? 'border-purple-300 focus:border-purple-500 focus:ring-purple-500' : 'border-green-300 focus:border-green-500 focus:ring-green-500'}`}
              data-testid="chat-input"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || connectionStatus !== 'connected'}
              className={`text-white px-6 ${
                useHybridRAG 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              data-testid="chat-submit-button"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Searching...</span>
                </div>
              ) : useHybridRAG ? (
                '🚀 Ask Hybrid'
              ) : (
                '🌲 Ask Pinecone'
              )}
            </Button>
          </div>
        </form>
        
        {/* Mode Info Banner */}
        <div className={`mt-3 p-2 rounded-lg ${
          useHybridRAG 
            ? 'bg-purple-50 border border-purple-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="text-xs">
            <strong>{useHybridRAG ? '🚀 Hybrid RAG Mode:' : '🌲 Vector Only Mode:'}</strong>{' '}
            {useHybridRAG 
              ? 'Combining semantic understanding with precise keyword matching for best results'
              : 'Pure semantic search using Pinecone cloud vector database'}
          </div>
        </div>

        {/* Connection Warning */}
        {connectionStatus === 'disconnected' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700">
              <strong>⚠️ Connection Required:</strong> Please ensure your {useHybridRAG ? 'Hybrid RAG' : 'Pinecone'} configuration is correct
            </div>
            <div className="text-xs text-red-600 mt-1 font-mono">
              Add <code>PINECONE_API_KEY</code> and <code>OPENAI_API_KEY</code> to your .env.local file
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