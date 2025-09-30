'use client'

import { useChat } from 'ai/react'
import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ayurveda',
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-96">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="flex items-start">
            <div className="w-10 h-10 bg-green-800 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none p-4 max-w-md shadow-sm">
              <p className="text-gray-800">🙏 Namaste! I'm your AyuBot assistant. I'm here to provide guidance on Ayurvedic principles and natural healing methods.</p>
              <p className="text-sm text-gray-600 mt-2">How can I help you today?</p>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'items-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-10 h-10 bg-green-800 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-white text-sm">🤖</span>
              </div>
            )}
            <div
              className={`rounded-2xl p-4 max-w-md ${
                message.role === 'user'
                  ? 'bg-green-800 text-white rounded-tr-none'
                  : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start">
            <div className="w-10 h-10 bg-green-800 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none p-4 max-w-md shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-green-800 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-green-800 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-green-800 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <button type="button" className="text-green-800 hover:text-green-900 transition p-2">
            📎
          </button>
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message here..."
              className="w-full bg-gray-100 rounded-full px-6 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-green-800 border-0"
              disabled={isLoading}
            />
            <button type="button" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-800 hover:text-green-900 transition p-2">
              🎤
            </button>
          </div>
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-green-800 text-white p-3 rounded-full hover:bg-green-600 transition"
          >
            ✈️
          </Button>
        </div>
      </form>
    </div>
  )
}
