// Create Pinecone index automatically
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
      const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
      process.env[key] = value;
    }
  });
  console.log('✅ Loaded environment variables from .env.local');
} catch (error) {
  console.warn('⚠️  Could not load .env.local:', error.message);
}

async function createPineconeIndex() {
  console.log('🔧 Creating Pinecone index...');
  
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME || 'ayurveda-knowledge';
  
  if (!apiKey) {
    console.error('❌ PINECONE_API_KEY not found in environment variables');
    return;
  }
  
  try {
    const pc = new Pinecone({
      apiKey: apiKey,
    });
    
    console.log(`📝 Creating index: ${indexName}`);
    
    // Create the index
    await pc.createIndex({
      name: indexName,
      dimension: 1536, // OpenAI text-embedding-3-small dimensions
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });
    
    console.log(`✅ Index '${indexName}' created successfully!`);
    console.log('⏳ Note: It may take a few minutes for the index to be fully ready.');
    
    // Wait a bit and check status
    setTimeout(async () => {
      try {
        const index = pc.index(indexName);
        const stats = await index.describeIndexStats();
        console.log('📊 Index stats:', stats);
      } catch (error) {
        console.log('⏳ Index still initializing, please wait a few more minutes...');
      }
    }, 10000); // Wait 10 seconds
    
  } catch (error) {
    console.error('❌ Error creating index:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Index already exists! You can proceed with the application.');
      } else if (error.message.includes('quota')) {
        console.log('💡 You may have reached your index limit. Check your Pinecone dashboard.');
      } else {
        console.log('💡 Full error:', error.message);
      }
    }
  }
}

// Run the creation
createPineconeIndex().catch(console.error);