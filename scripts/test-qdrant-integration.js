#!/usr/bin/env node
/**
 * Test script for Qdrant integration
 * Run this script to test the Qdrant vector store functionality
 */

const { QdrantClient } = require('@qdrant/js-client-rest');

async function testQdrantConnection() {
  console.log('🔍 Testing Qdrant connection...');
  
  try {
    const client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });

    // Test connection
    const collections = await client.getCollections();
    console.log('✅ Connected to Qdrant successfully');
    console.log(`📊 Found ${collections.collections.length} collections:`, 
                collections.collections.map(c => c.name));

    // Test collection creation
    const testCollectionName = 'test-ayurveda-' + Date.now();
    console.log(`🔧 Creating test collection: ${testCollectionName}`);
    
    await client.createCollection(testCollectionName, {
      vectors: {
        size: 1536, // OpenAI text-embedding-3-small dimension
        distance: 'Cosine',
      },
    });
    
    console.log('✅ Test collection created successfully');

    // Test point insertion
    const testPoint = {
      id: 'test-1',
      vector: new Array(1536).fill(0).map(() => Math.random()),
      payload: {
        content: 'Test ayurvedic document',
        herb_name: 'Turmeric',
        category: 'herb',
        test: true,
      },
    };

    await client.upsert(testCollectionName, {
      wait: true,
      points: [testPoint],
    });

    console.log('✅ Test point inserted successfully');

    // Test search
    const searchResults = await client.search(testCollectionName, {
      vector: testPoint.vector,
      limit: 1,
      with_payload: true,
    });

    console.log('✅ Search completed successfully');
    console.log(`📊 Found ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log('🔍 Result:', JSON.stringify(searchResults[0], null, 2));
    }

    // Cleanup
    await client.deleteCollection(testCollectionName);
    console.log('🗑️ Test collection cleaned up');

    console.log('🎉 All Qdrant tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Qdrant test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
      console.log('💡 Make sure Qdrant is running:');
      console.log('   docker run -d -p 6333:6333 -p 6334:6334 qdrant/qdrant:latest');
    }
    
    return false;
  }
}

async function testEnvironmentConfiguration() {
  console.log('\n🔧 Testing environment configuration...');
  
  const requiredVars = ['OPENAI_API_KEY'];
  const optionalVars = ['QDRANT_URL', 'QDRANT_API_KEY', 'VECTOR_DB_TYPE'];
  
  console.log('📋 Required variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`   ❌ ${varName}: NOT SET`);
    }
  });
  
  console.log('📋 Optional variables:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`   ${value ? '✅' : '⚠️'} ${varName}: ${value || 'not set'}`);
  });
  
  return requiredVars.every(varName => process.env[varName]);
}

async function main() {
  console.log('🚀 Starting Qdrant Integration Tests\n');
  
  const envOk = await testEnvironmentConfiguration();
  if (!envOk) {
    console.log('\n❌ Environment configuration incomplete');
    console.log('💡 Please set required environment variables in .env.local');
    process.exit(1);
  }
  
  const qdrantOk = await testQdrantConnection();
  if (!qdrantOk) {
    console.log('\n❌ Qdrant connection test failed');
    process.exit(1);
  }
  
  console.log('\n🎉 All tests passed! Qdrant integration is ready.');
  console.log('💡 You can now use VECTOR_DB_TYPE=qdrant in your .env.local');
}

// Manually load .env.local without dotenv dependency
function loadEnvLocal() {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn('⚠️  Could not load .env.local:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  loadEnvLocal();
  main().catch(console.error);
}

module.exports = {
  testQdrantConnection,
  testEnvironmentConfiguration,
};