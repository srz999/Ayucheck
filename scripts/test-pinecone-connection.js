// Test Pinecone connection directly
import { Pinecone } from '@pinecone-database/pinecone';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manually load .env.local without dotenv dependency
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
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

async function testPineconeConnection() {
  console.log('🔍 Testing Pinecone connection...');
  
  // Check if API key is loaded
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME || 'ayurveda-knowledge';
  
  console.log('API Key present:', !!apiKey);
  console.log('API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');
  console.log('Index name:', indexName);
  
  if (!apiKey) {
    console.error('❌ PINECONE_API_KEY not found in environment variables');
    return;
  }
  
  try {
    // Initialize Pinecone client
    const pc = new Pinecone({
      apiKey: apiKey,
    });
    
    console.log('✅ Pinecone client initialized successfully');
    
    // List all indexes
    console.log('📋 Listing all indexes...');
    const indexList = await pc.listIndexes();
    console.log('Available indexes:', indexList.indexes?.map(idx => idx.name) || []);
    
    // Check if our specific index exists
    const ourIndex = indexList.indexes?.find(idx => idx.name === indexName);
    if (ourIndex) {
      console.log(`✅ Index '${indexName}' found!`);
      console.log('Index details:', ourIndex);
      
      // Try to get index stats
      const index = pc.index(indexName);
      const stats = await index.describeIndexStats();
      console.log('Index stats:', stats);
      
    } else {
      console.log(`❌ Index '${indexName}' not found. Available indexes:`, 
        indexList.indexes?.map(idx => idx.name) || []);
      console.log('\n📝 To create the index, go to: https://app.pinecone.io');
      console.log('Create with:');
      console.log('- Name:', indexName);
      console.log('- Dimensions: 1536');
      console.log('- Metric: cosine');
    }
    
  } catch (error) {
    console.error('❌ Error connecting to Pinecone:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.log('💡 Solution: Check your PINECONE_API_KEY in .env.local');
      } else if (error.message.includes('401')) {
        console.log('💡 Solution: API key is invalid or expired');
      } else if (error.message.includes('404')) {
        console.log('💡 Solution: Index does not exist, create it in Pinecone console');
      } else {
        console.log('💡 Full error:', error.message);
      }
    }
  }
}

// Run the test
testPineconeConnection().catch(console.error);