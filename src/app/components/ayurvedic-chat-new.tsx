'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AyurvedicChat() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ayurveda',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `🌿 **Welcome to the Ayurvedic Pharmacopoeia Chat**

I'm here to help you explore the wisdom of traditional Ayurvedic medicine based on classical texts. You can ask me about:

• **Herbs & Plants**: Properties, uses, and preparation methods of Ayurvedic medicines
• **Therapeutic Uses**: Traditional treatments for various conditions
• **Dosage & Preparation**: How to prepare and use Ayurvedic remedies
• **Sanskrit Terms**: Meanings and context of traditional terminology
• **Quality Standards**: Information about Ayurvedic drug standards

*Note: This information is for educational purposes only. Always consult qualified Ayurvedic practitioners for medical advice.*

What would you like to learn about today?`
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
      // Trigger form submission
      const form = e.currentTarget.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  };

  const suggestions = [
    "What is Ajagandha and its therapeutic uses?",
    "Tell me about Amalaki properties",
    "How to prepare Guggulu?",
    "Aragvadha therapeutic uses and dosage",
    "Quality control standards for Ayurvedic drugs"
  ];

  const formatMessage = (content: string) => {
    // Convert markdown-like formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-amber-50 to-orange-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-green-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4 text-white">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">🌿</span>
            <h1 className="text-xl font-semibold">Ayurvedic Pharmacopoeia</h1>
            <span className="text-2xl">🌿</span>
          </div>
          <p className="text-center text-green-100 text-sm mt-1">
            Classical Ayurvedic Medicine Knowledge Base
          </p>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-green-25 to-amber-25">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm'
                    : 'bg-gradient-to-r from-green-100 to-emerald-50 text-gray-800 border border-green-200 rounded-bl-sm'
                }`}
              >
                <div 
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
                {message.role === 'assistant' && (
                  <div className="text-xs mt-2 text-gray-500 border-t border-green-200 pt-2">
                    📖 Based on Ayurvedic Pharmacopoeia
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-green-100 to-emerald-50 text-gray-800 border border-green-200 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  <span className="text-sm">Searching ancient texts...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Section */}
        <div className="p-4 bg-white/90 border-t border-green-100">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <div className="flex-1">
              <Input
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                placeholder="Ask about Ayurvedic herbs, remedies, or traditional medicine..."
                className="w-full rounded-full border-green-200 focus:border-green-400 focus:ring-green-300 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm placeholder:text-gray-400"
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '⏳' : '🌿'} Send
            </Button>
          </form>
          
          {/* Quick suggestions */}
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">📝 Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const syntheticEvent = {
                      target: { value: suggestion },
                      preventDefault: () => {}
                    } as React.ChangeEvent<HTMLInputElement>;
                    handleInputChange(syntheticEvent);
                  }}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors duration-200 border border-green-200 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-3 text-xs text-gray-500 text-center">
            🏛️ Knowledge base: 220+ text chunks from Ayurvedic Pharmacopoeia | 📚 Vol-1 Complete
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-amber-50 text-center">
          <p className="text-xs text-gray-500">
            ⚠️ For informational purposes only. Consult a qualified Ayurvedic practitioner for personalized treatment.
          </p>
        </div>
      </div>
    </div>
  );
}