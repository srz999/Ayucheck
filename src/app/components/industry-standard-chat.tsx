'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MarkdownRenderer from './markdown-renderer';

export default function IndustryStandardChat() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [pineconeInfo, setPineconeInfo] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/embedpinecone',
    initialMessages: [{
      id: 'welcome',
      role: 'assistant',
      content: `# 🌟 Welcome to AyuCheck.in - Your AI Wellness Assistant

I'm here to guide you through the wisdom of traditional medicine with modern AI intelligence. I can help you with:

- **🌿 Ayurvedic Medicine**: Dosha analysis, herbal remedies, and lifestyle guidance
- **☯️ Traditional Chinese Medicine**: Qi assessment and acupressure points
- **💧 Homeopathy**: Constitutional analysis and remedy selection

*Note: This information is for educational purposes only. Always consult qualified practitioners for medical advice.*

**What would you like to explore today?**`
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
      case 'connected': return 'text-emerald-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return `✅ Connected`;
      case 'disconnected': return '❌ Disconnected';
      default: return '⏳ Connecting...';
    }
  };

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-white/10 border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🌿</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-purple-500 bg-clip-text text-transparent">
                  AyuCheck.in
                </h1>
                <p className="text-xs text-gray-300">AI-Powered Wellness</p>
              </div>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-gray-300 hover:text-emerald-400 transition-colors">Home</a>
              <a href="#services" className="text-gray-300 hover:text-emerald-400 transition-colors">Services</a>
              <a href="#about" className="text-gray-300 hover:text-emerald-400 transition-colors">About</a>
              <button 
                onClick={() => setShowChat(true)}
                className="bg-gradient-to-r from-emerald-500 to-purple-600 px-6 py-2 rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
              >
                Get Started
              </button>
            </div>
            
            {/* Mobile Menu */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white text-2xl"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6" id="home">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center bg-gradient-to-r from-emerald-500/20 to-purple-500/20 rounded-full px-6 py-2 mb-6">
              <span className="text-emerald-400 mr-2">✨</span>
              <span className="text-sm">Powered by Advanced AI Technology</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Discover{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-purple-500 bg-clip-text text-transparent">
                Natural Healing
              </span>
              <br />
              Like Never Before
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Experience personalized alternative medicine guidance through Ayurveda, TCM, and Homeopathy with our intelligent AI assistant.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => setShowChat(true)}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 rounded-2xl font-semibold hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 transform hover:scale-105"
              >
                <span className="mr-2">💬</span>
                Start Free Consultation
              </button>
              <button className="border border-purple-500 px-8 py-4 rounded-2xl font-semibold hover:bg-purple-500/10 transition-all duration-300">
                <span className="mr-2">▶️</span>
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-black/20" id="services">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Healing Modalities{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-purple-500 bg-clip-text text-transparent">
                We Offer
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Explore ancient wisdom combined with modern AI to guide your wellness journey
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Ayurveda Card */}
            <div className="group bg-gradient-to-br from-emerald-900/30 to-emerald-800/30 p-8 rounded-3xl border border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🕉️</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-emerald-400">Ayurveda</h3>
              <p className="text-gray-300 mb-6">Ancient Indian healing system focusing on balance and natural remedies</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-300">
                  <span className="text-emerald-400 mr-2">✓</span>
                  Dosha Analysis
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <span className="text-emerald-400 mr-2">✓</span>
                  Herbal Recommendations
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <span className="text-emerald-400 mr-2">✓</span>
                  Lifestyle Guidance
                </li>
              </ul>
              <button 
                onClick={() => setShowChat(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-semibold transition-colors"
              >
                Explore Ayurveda
              </button>
            </div>
            
            {/* TCM Card */}
            <div className="group bg-gradient-to-br from-purple-900/30 to-purple-800/30 p-8 rounded-3xl border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">☯️</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-purple-400">Chinese Medicine</h3>
              <p className="text-gray-300 mb-6">Traditional healing focusing on energy flow and harmony</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-300">
                  <span className="text-purple-400 mr-2">✓</span>
                  Qi Assessment
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <span className="text-purple-400 mr-2">✓</span>
                  Acupressure Points
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <span className="text-purple-400 mr-2">✓</span>
                  Herbal Formulas
                </li>
              </ul>
              <button 
                onClick={() => setShowChat(true)}
                className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-semibold transition-colors"
              >
                Explore TCM
              </button>
            </div>
            
            {/* Homeopathy Card */}
            <div className="group bg-gradient-to-br from-blue-900/30 to-blue-800/30 p-8 rounded-3xl border border-blue-500/20 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">💧</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-blue-400">Homeopathy</h3>
              <p className="text-gray-300 mb-6">Gentle healing through natural, highly diluted substances</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-300">
                  <span className="text-blue-400 mr-2">✓</span>
                  Constitutional Analysis
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <span className="text-blue-400 mr-2">✓</span>
                  Remedy Selection
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <span className="text-blue-400 mr-2">✓</span>
                  Potency Guidance
                </li>
              </ul>
              <button 
                onClick={() => setShowChat(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold transition-colors"
              >
                Explore Homeopathy
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <h2 className="text-4xl font-bold mb-8">
                Why Choose{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-purple-500 bg-clip-text text-transparent">
                  AyuCheck.in?
                </span>
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2 text-emerald-400">AI-Powered Intelligence</h4>
                    <p className="text-gray-300">Advanced machine learning trained on thousands of traditional medicine texts and modern research.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2 text-purple-400">Privacy First</h4>
                    <p className="text-gray-300">Your health information is encrypted and never shared with third parties.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2 text-blue-400">Comprehensive Knowledge Base</h4>
                    <p className="text-gray-300">Access to extensive databases of Ayurvedic, TCM, and Homeopathic remedies.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2 text-orange-400">Instant Responses</h4>
                    <p className="text-gray-300">Get immediate answers to your health questions 24/7.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Status Card */}
            <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🌲</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">Cloud-Powered AI</h3>
                <p className="text-gray-400 text-sm">Enterprise-grade vector database</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Connection Status</span>
                    <span className={`font-semibold ${getStatusColor()}`}>{getStatusText()}</span>
                  </div>
                </div>

                {pineconeInfo && (
                  <>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Vector Database</span>
                        <span className="font-semibold text-emerald-400">Pinecone Cloud</span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Knowledge Entries</span>
                        <span className="font-semibold text-purple-400">{pineconeInfo.vectorCount}+</span>
                      </div>
                    </div>
                  </>
                )}

                <button
                  onClick={checkPineconeHealth}
                  disabled={connectionStatus === 'checking'}
                  className="w-full bg-gradient-to-r from-emerald-500 to-purple-600 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  {connectionStatus === 'checking' ? '⏳ Checking...' : '🔄 Refresh Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="container mx-auto">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">
              ⚠️ For informational purposes only. Consult a qualified practitioner for personalized treatment.
            </p>
            <p className="text-xs text-gray-500">
              © 2024 AyuCheck.in - AI-Powered Alternative Medicine Platform
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Chat Widget */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl h-[600px] flex flex-col border border-emerald-500/20">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-purple-700 p-4 rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">AyuBot Pro</h4>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                    <span className="text-xs text-white/80">{getStatusText()}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={toggleChat}
                className="text-white/80 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-br-sm'
                        : 'bg-white/10 text-white border border-white/20 rounded-bl-sm backdrop-blur-sm'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    ) : (
                      <MarkdownRenderer 
                        content={message.content}
                        className="text-sm prose-invert prose-sm max-w-none"
                      />
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 border border-white/20 backdrop-blur-sm p-4 rounded-2xl rounded-bl-sm">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                      <span className="text-sm">Searching knowledge base...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/10">
              <form onSubmit={handleSubmit} className="flex space-x-3">
                <Input
                  value={input}
                  placeholder={
                    connectionStatus === 'connected'
                      ? "Ask about natural healing, herbs, or treatments..."
                      : "Please wait for connection..."
                  }
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || connectionStatus !== 'connected'}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-full px-6 focus:border-emerald-400 focus:ring-emerald-400"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim() || connectionStatus !== 'connected'}
                  className="bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-600 hover:to-purple-700 text-white px-8 rounded-full"
                >
                  {isLoading ? '⏳' : '🌿'} Send
                </Button>
              </form>
              
              {/* Quick suggestions */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-gray-400">💡 Try:</span>
                {[
                  "Stress relief remedies",
                  "Better sleep tips",
                  "Natural energy boosters"
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleInputChange({ target: { value: suggestion } } as any);
                    }}
                    disabled={connectionStatus !== 'connected'}
                    className="px-3 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-full transition-colors border border-emerald-500/30 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      {!showChat && (
        <button
          onClick={toggleChat}
          className="fixed bottom-8 right-8 z-40 bg-gradient-to-r from-emerald-500 to-purple-600 w-16 h-16 rounded-full shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 flex items-center justify-center group hover:scale-110"
        >
          <span className="text-3xl group-hover:scale-110 transition-transform">💬</span>
        </button>
      )}
    </div>
  );
}
