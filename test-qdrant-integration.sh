#!/bin/bash

# Qdrant Integration Test Script
# This script tests the Qdrant integration for the Next.js RAG application

echo "🧪 Testing Qdrant Integration for Next.js RAG App"
echo "================================================="
echo ""

# Check if required environment variables are set
echo "📋 Checking environment configuration..."

if [ -f ".env.local" ]; then
    echo "✅ Found .env.local file"
    source .env.local
else
    echo "⚠️  No .env.local file found. Using .env.example as reference."
    echo "   Please copy .env.example to .env.local and configure your settings."
fi

# Test 1: Check if Docker is available
echo ""
echo "🐳 Checking Docker availability..."
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    
    # Test 2: Check if Qdrant is running
    echo ""
    echo "🔍 Checking if Qdrant is running..."
    
    if curl -s http://localhost:6333/ > /dev/null 2>&1; then
        echo "✅ Qdrant is running on port 6333"
        
        # Test the collections endpoint
        echo ""
        echo "📊 Testing Qdrant collections endpoint..."
        curl -s http://localhost:6333/collections | jq . 2>/dev/null || echo "Raw response: $(curl -s http://localhost:6333/collections)"
        
    else
        echo "❌ Qdrant is not running on port 6333"
        echo ""
        echo "🚀 Starting Qdrant with Docker..."
        
        # Try to start Qdrant
        docker run -d -p 6333:6333 -p 6334:6334 \
            -v $(pwd)/qdrant_storage:/qdrant/storage:z \
            --name qdrant-rag \
            qdrant/qdrant:latest
        
        if [ $? -eq 0 ]; then
            echo "✅ Qdrant container started successfully"
            echo "⏳ Waiting for Qdrant to be ready..."
            sleep 5
            
            # Test again
            if curl -s http://localhost:6333/ > /dev/null 2>&1; then
                echo "✅ Qdrant is now running and accessible"
            else
                echo "❌ Qdrant failed to start properly"
            fi
        else
            echo "❌ Failed to start Qdrant container"
            echo "   This might be because Docker is not available or another container with the same name exists."
            echo "   Try: docker rm -f qdrant-rag"
        fi
    fi
else
    echo "❌ Docker is not installed or not in PATH"
    echo "   Please install Docker to run Qdrant locally"
    echo "   Alternative: Use Qdrant Cloud at https://cloud.qdrant.io/"
fi

# Test 3: Check TypeScript compilation
echo ""
echo "🔧 Checking TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "⚠️  TypeScript compilation had issues. Check for errors:"
    npm run build
fi

# Test 4: Test the API endpoint (if Next.js is running)
echo ""
echo "🌐 Testing API endpoint (requires Next.js to be running)..."

if curl -s http://localhost:3000/api/embedyurveda > /dev/null 2>&1; then
    echo "✅ API endpoint is accessible"
    echo "📊 Health check response:"
    curl -s http://localhost:3000/api/embedyurveda | jq . 2>/dev/null || echo "Raw response: $(curl -s http://localhost:3000/api/embedyurveda)"
else
    echo "⚠️  API endpoint is not accessible. Make sure Next.js is running:"
    echo "   npm run dev"
fi

echo ""
echo "🎯 Integration Test Summary:"
echo "============================"
echo "1. Docker availability: $(command -v docker &> /dev/null && echo "✅" || echo "❌")"
echo "2. Qdrant running: $(curl -s http://localhost:6333/ > /dev/null 2>&1 && echo "✅" || echo "❌")"
echo "3. TypeScript compilation: $(npm run build > /dev/null 2>&1 && echo "✅" || echo "⚠️")"
echo "4. API endpoint: $(curl -s http://localhost:3000/api/embedyurveda > /dev/null 2>&1 && echo "✅" || echo "⚠️")"
echo ""
echo "📚 Next Steps:"
echo "=============="
echo "1. If Qdrant is not running, start it with: docker run -d -p 6333:6333 -p 6334:6334 -v \$(pwd)/qdrant_storage:/qdrant/storage:z qdrant/qdrant:latest"
echo "2. Start the Next.js dev server: npm run dev"
echo "3. Test the integration at: http://localhost:3000/api/embedyurveda"
echo "4. Try a chat query to test the RAG pipeline"
echo ""
echo "🔗 Useful Resources:"
echo "===================="
echo "- Qdrant Dashboard: http://localhost:6333/dashboard"
echo "- API Health Check: http://localhost:3000/api/embedyurveda"
echo "- Documentation: ./qdrant_vectordb_use.md"