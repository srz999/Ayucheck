// Upload JSONL data to Pinecone with embeddings
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manually load .env.local
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
  console.log('✅ Loaded environment variables from .env.local');
} catch (error) {
  console.error('❌ Could not load .env.local:', error.message);
  process.exit(1);
}

// Configuration
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'ayurveda-knowledge';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BATCH_SIZE = 100; // Pinecone batch upsert limit
const EMBEDDING_BATCH_SIZE = 20; // OpenAI API rate limit consideration

// Initialize clients
const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Load JSONL file
function loadJSONL(filePath) {
  console.log(`📂 Loading data from: ${filePath}`);
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  const data = lines.map(line => JSON.parse(line));
  console.log(`✅ Loaded ${data.length} chunks`);
  return data;
}

// Generate embedding for text
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error.message);
    throw error;
  }
}

// Generate embeddings in batches
async function generateEmbeddingsBatch(texts) {
  const embeddings = [];
  
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    console.log(`  🔄 Generating embeddings for items ${i + 1}-${Math.min(i + batch.length, texts.length)}...`);
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        encoding_format: 'float'
      });
      
      embeddings.push(...response.data.map(item => item.embedding));
      
      // Rate limiting - wait a bit between batches
      if (i + EMBEDDING_BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`❌ Error in batch ${i}-${i + batch.length}:`, error.message);
      throw error;
    }
  }
  
  return embeddings;
}

// Upload to Pinecone
async function uploadToPinecone(data, namespace = 'default') {
  console.log(`\n📤 Uploading ${data.length} vectors to Pinecone...`);
  console.log(`📍 Namespace: ${namespace}`);
  
  const index = pc.index(PINECONE_INDEX_NAME);
  
  // Prepare texts for embedding
  console.log('\n🤖 Generating embeddings...');
  const texts = data.map(item => item.text);
  const embeddings = await generateEmbeddingsBatch(texts);
  
  console.log(`✅ Generated ${embeddings.length} embeddings`);
  
  // Prepare vectors for Pinecone
  const vectors = data.map((item, idx) => ({
    id: item.id,
    values: embeddings[idx],
    metadata: {
      text: item.text,
      type: item.metadata.type,
      page: item.metadata.page,
      section: item.metadata.section || '',
      subsection: item.metadata.subsection || '',
      bbox: JSON.stringify(item.metadata.bbox)
    }
  }));
  
  // Upload in batches
  console.log('\n📤 Uploading vectors to Pinecone...');
  let uploadedCount = 0;
  
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    console.log(`  ⬆️  Uploading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)} (${batch.length} vectors)...`);
    
    try {
      await index.namespace(namespace).upsert(batch);
      uploadedCount += batch.length;
      console.log(`  ✅ Uploaded ${uploadedCount}/${vectors.length} vectors`);
      
      // Small delay between batches
      if (i + BATCH_SIZE < vectors.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Error uploading batch:`, error.message);
      throw error;
    }
  }
  
  console.log(`\n✅ Successfully uploaded ${uploadedCount} vectors!`);
  
  // Get stats
  console.log('\n📊 Checking index stats...');
  const stats = await index.describeIndexStats();
  console.log('Index stats:', JSON.stringify(stats, null, 2));
}

// Main function
async function main() {
  console.log('🚀 Starting Pinecone upload process...\n');
  
  // Check environment variables
  if (!PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY not found');
    process.exit(1);
  }
  
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }
  
  console.log(`📋 Index: ${PINECONE_INDEX_NAME}`);
  
  try {
    // Check if index exists
    console.log('\n🔍 Checking Pinecone index...');
    const indexList = await pc.listIndexes();
    const indexExists = indexList.indexes?.some(idx => idx.name === PINECONE_INDEX_NAME);
    
    if (!indexExists) {
      console.error(`❌ Index '${PINECONE_INDEX_NAME}' not found!`);
      console.log('💡 Run: node create-pinecone-index.js');
      process.exit(1);
    }
    
    console.log(`✅ Index '${PINECONE_INDEX_NAME}' found!`);
    
    // Ask which file(s) to upload
    const skinDiseasesPath = resolve(process.cwd(), 'src/data/ayu_skinDiseases_rag.jsonl');
    const mentalDisordersPath = resolve(process.cwd(), 'src/data/ayu_mentalDisorders_rag.jsonl');
    
    // Get command line argument
    const fileArg = process.argv[2];
    
    if (fileArg === 'skin' || fileArg === 'both' || !fileArg) {
      console.log('\n' + '='.repeat(60));
      console.log('📄 Processing: Skin Diseases Data');
      console.log('='.repeat(60));
      const skinData = loadJSONL(skinDiseasesPath);
      await uploadToPinecone(skinData, 'skin-diseases');
    }
    
    if (fileArg === 'mental' || fileArg === 'both') {
      console.log('\n' + '='.repeat(60));
      console.log('📄 Processing: Mental Disorders Data');
      console.log('='.repeat(60));
      const mentalData = loadJSONL(mentalDisordersPath);
      await uploadToPinecone(mentalData, 'mental-disorders');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Upload completed successfully!');
    console.log('='.repeat(60));
    console.log('\n💡 Usage examples:');
    console.log('  - Upload skin diseases only: node scripts/upload-to-pinecone.js skin');
    console.log('  - Upload mental disorders only: node scripts/upload-to-pinecone.js mental');
    console.log('  - Upload both: node scripts/upload-to-pinecone.js both');
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error);
    process.exit(1);
  }
}

// Run
main().catch(console.error);
