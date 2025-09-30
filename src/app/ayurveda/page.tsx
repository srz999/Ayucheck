'use client'

import { useState } from 'react'
import Chat from '@/components/chat'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AyurvedaPage() {
  const [selectedTherapy, setSelectedTherapy] = useState('ayurveda')

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-800 to-green-600 p-2 rounded-full">
                <span className="text-white text-2xl">🌿</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-800">AyuCheck.in</h1>
                <p className="text-sm text-gray-600">Alternative Medicine Advisor</p>
              </div>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-700 hover:text-green-800 transition">Home</Link>
              <a href="#therapies" className="text-green-800 font-medium hover:text-green-900 transition">Therapies</a>
              <a href="#about" className="text-gray-700 hover:text-green-800 transition">About</a>
              <a href="#contact" className="text-gray-700 hover:text-green-800 transition">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Chat Interface Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold text-green-800 mb-4">Start Your Consultation</h3>
              <p className="text-xl text-gray-700">Choose your preferred therapy and begin your personalized health journey</p>
            </div>
            
            {/* Therapy Selection */}
            <div className="mb-8">
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {[
                  { id: 'ayurveda', label: '🕉️ Ayurveda' },
                  { id: 'chinese', label: '☯️ Chinese Medicine' },
                  { id: 'homeopathy', label: '💧 Homeopathy' },
                  { id: 'general', label: '🌿 General' }
                ].map((therapy) => (
                  <Button
                    key={therapy.id}
                    onClick={() => setSelectedTherapy(therapy.id)}
                    className={`px-6 py-3 rounded-full font-medium transition ${
                      selectedTherapy === therapy.id
                        ? 'bg-green-800 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-green-800 hover:text-white'
                    }`}
                  >
                    {therapy.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Chat Component */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Chat Header */}
              <div className="bg-green-800 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mr-4">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">AyuBot Assistant</h4>
                      <p className="text-green-200">
                        {selectedTherapy === 'ayurveda' && 'Specialized in Ayurveda • Online'}
                        {selectedTherapy === 'chinese' && 'Specialized in Chinese Medicine • Online'}
                        {selectedTherapy === 'homeopathy' && 'Specialized in Homeopathy • Online'}
                        {selectedTherapy === 'general' && 'General Alternative Medicine • Online'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Chat Messages Container */}
              <div className="relative">
                <Chat />
                
                {/* Quick Suggestion Buttons */}
                <div className="absolute bottom-20 left-6 right-6">
                  <div className="flex flex-wrap gap-2">
                    {['Digestive issues', 'Stress & anxiety', 'Sleep problems', 'Skin conditions'].map((suggestion) => (
                      <Button
                        key={suggestion}
                        className="bg-green-600 text-white px-4 py-2 rounded-full text-sm hover:bg-green-800 transition"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Chat Features */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex justify-center space-x-6 text-sm text-gray-600">
                  <span>🛡️ Secure & Private</span>
                  <span>🕐 24/7 Available</span>
                  <span>👨‍⚕️ Expert Guidance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}