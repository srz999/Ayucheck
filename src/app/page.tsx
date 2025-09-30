import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-800 to-green-600 p-2 rounded-full">
                <span className="text-white text-2xl">🌿</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-800">AyuCheck.in</h1>
                <p className="text-sm text-gray-600">Alternative Medicine Advisor</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-green-800 font-medium hover:text-green-900 transition">Home</a>
              <a href="#therapies" className="text-gray-700 hover:text-green-800 transition">Therapies</a>
              <a href="#about" className="text-gray-700 hover:text-green-800 transition">About</a>
              <a href="#contact" className="text-gray-700 hover:text-green-800 transition">Contact</a>
              <Link href="/ayurveda">
                <Button className="bg-green-800 text-white px-6 py-2 rounded-full hover:bg-green-600 transition">
                  Start Chat
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-1/2 mb-10 lg:mb-0">
              <div className="mb-6">
                <span className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium">
                  🌿 Natural Healing Wisdom
                </span>
              </div>
              <h2 className="text-5xl lg:text-6xl font-bold text-green-800 mb-6 leading-tight">
                Your Personal
                <span className="text-black"> Alternative Medicine</span>
                Advisor
              </h2>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Get personalized guidance on Ayurveda, Traditional Chinese Medicine, and Homeopathy. 
                Chat with our AI-powered advisor for holistic health solutions tailored to your needs.
              </p>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center bg-white rounded-lg px-4 py-3 shadow-md">
                  <span className="text-2xl mr-3">🕉️</span>
                  <span className="text-green-800 font-medium">Ayurveda</span>
                </div>
                <div className="flex items-center bg-white rounded-lg px-4 py-3 shadow-md">
                  <span className="text-2xl mr-3">☯️</span>
                  <span className="text-green-800 font-medium">Chinese Medicine</span>
                </div>
                <div className="flex items-center bg-white rounded-lg px-4 py-3 shadow-md">
                  <span className="text-2xl mr-3">💧</span>
                  <span className="text-green-800 font-medium">Homeopathy</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/ayurveda">
                  <Button className="bg-green-800 text-white px-8 py-4 rounded-lg font-medium hover:bg-green-600 transition transform hover:scale-105">
                    Start Consultation
                  </Button>
                </Link>
                <Button variant="outline" className="border-2 border-green-800 text-green-800 px-8 py-4 rounded-lg font-medium hover:bg-green-800 hover:text-white transition">
                  Watch Demo
                </Button>
              </div>
            </div>
            
            <div className="lg:w-1/2 flex justify-center">
              <div className="relative">
                <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-3xl p-8 shadow-2xl">
                  <div className="bg-white rounded-2xl p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-800 rounded-full flex items-center justify-center">
                        <span className="text-white">🤖</span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-green-800">AyuBot</p>
                        <p className="text-sm text-gray-500">Online now</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm">👋 Hi! I&apos;m here to help you explore natural healing options. What symptoms would you like to address?</p>
                      </div>
                      <div className="bg-green-800 text-white rounded-lg p-3 ml-8">
                        <p className="text-sm">I have chronic headaches and stress</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm">🌿 Based on Ayurveda, this could be related to Vata imbalance. I recommend pranayama breathing exercises and herbs like Brahmi...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="therapies" className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-green-800 mb-4">Comprehensive Alternative Therapies</h3>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Explore ancient healing wisdom backed by modern AI technology for personalized natural health solutions
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition transform hover:-translate-y-2">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-800 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🕉️</span>
                </div>
                <h4 className="text-2xl font-bold text-green-800 mb-2">Ayurveda</h4>
                <p className="text-gray-600">Ancient Indian holistic healing system</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">✓ Dosha assessment & balancing</li>
                <li className="flex items-center">✓ Herbal medicine recommendations</li>
                <li className="flex items-center">✓ Dietary & lifestyle guidance</li>
                <li className="flex items-center">✓ Panchakarma detox protocols</li>
              </ul>
              <Link href="/ayurveda">
                <Button className="w-full bg-green-800 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition">
                  Explore Ayurveda
                </Button>
              </Link>
            </div>
            
            <div className="bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition transform hover:-translate-y-2">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-800 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">☯️</span>
                </div>
                <h4 className="text-2xl font-bold text-green-800 mb-2">Chinese Medicine</h4>
                <p className="text-gray-600">Ancient Chinese healing art for balance and wellness</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">✓ Yin Yang diagnosis & treatment</li>
                <li className="flex items-center">✓ Acupuncture & acupressure</li>
                <li className="flex items-center">✓ Herbal medicine prescriptions</li>
                <li className="flex items-center">✓ Tai Chi & Qigong exercises</li>
              </ul>
              <Link href="/chinese-medicine">
                <Button className="w-full bg-green-800 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition">
                  Explore Chinese Medicine
                </Button>
              </Link>
            </div>
            
            <div className="bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition transform hover:-translate-y-2">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-800 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💧</span>
                </div>
                <h4 className="text-2xl font-bold text-green-800 mb-2">Homeopathy</h4>
                <p className="text-gray-600">Gentle and natural remedy system</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">✓ Constitutional analysis</li>
                <li className="flex items-center">✓ Remedy selection & dosage</li>
                <li className="flex items-center">✓ Follow-up & remedy adjustment</li>
                <li className="flex items-center">✓ Acute and chronic condition treatment</li>
              </ul>
              <Link href="/homeopathy">
                <Button className="w-full bg-green-800 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition">
                  Explore Homeopathy
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-green-800 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <h4 className="text-4xl font-bold mb-2">50,000+</h4>
              <p className="text-green-200">Happy Users</p>
            </div>
            <div>
              <h4 className="text-4xl font-bold mb-2">95%</h4>
              <p className="text-green-200">Satisfaction Rate</p>
            </div>
            <div>
              <h4 className="text-4xl font-bold mb-2">1000+</h4>
              <p className="text-green-200">Natural Remedies</p>
            </div>
            <div>
              <h4 className="text-4xl font-bold mb-2">24/7</h4>
              <p className="text-green-200">AI Support</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}