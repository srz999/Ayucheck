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

// Load table JSONL files (which have different structure)
function loadTableJSONL(filePath) {
  console.log(`📂 Loading table data from: ${filePath}`);
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  const data = lines.map(line => {
    const parsed = JSON.parse(line);
    // Table files already have the correct structure with id, text, and metadata
    return parsed;
  });
  console.log(`✅ Loaded ${data.length} table entries`);
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
  const vectors = data.map((item, idx) => {
    const baseMetadata = {
      text: item.text,
      type: item.metadata.type,
      page: item.metadata.page,
    };
    
    // Add optional fields only if they exist
    if (item.metadata.section) baseMetadata.section = item.metadata.section;
    if (item.metadata.subsection) baseMetadata.subsection = item.metadata.subsection;
    if (item.metadata.source) baseMetadata.source = item.metadata.source;
    if (item.metadata.page_range) baseMetadata.page_range = item.metadata.page_range;
    if (item.metadata.bbox) baseMetadata.bbox = JSON.stringify(item.metadata.bbox);
    if (item.metadata.confidence) baseMetadata.confidence = item.metadata.confidence;
    
    // Add table structure info if present
    if (item.metadata.table_structure) {
      baseMetadata.table_rows = item.metadata.table_structure.rows;
      baseMetadata.table_columns = item.metadata.table_structure.columns;
      baseMetadata.table_cells = item.metadata.table_structure.cells;
    }
    
    return {
      id: item.id,
      values: embeddings[idx],
      metadata: baseMetadata
    };
  });
  
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
    
    // Define file paths
    const skinDiseasesPath = resolve(process.cwd(), 'src/data/ayu_skinDiseases_rag.jsonl');
    const mentalDisordersPath = resolve(process.cwd(), 'src/data/ayu_mentalDisorders_rag.jsonl');
    const skinTablesPath = resolve(process.cwd(), 'src/data/skin_diseases_tables.jsonl');
    const mentalTablesPath = resolve(process.cwd(), 'src/data/mental_disorders_tables_final.jsonl');
    
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
    
    if (fileArg === 'skin-tables' || fileArg === 'tables' || fileArg === 'all') {
      console.log('\n' + '='.repeat(60));
      console.log('📊 Processing: Skin Diseases Tables');
      console.log('='.repeat(60));
      const skinTablesData = loadTableJSONL(skinTablesPath);
      await uploadToPinecone(skinTablesData, 'skin-diseases-tables');
    }
    
    if (fileArg === 'mental-tables' || fileArg === 'tables' || fileArg === 'all') {
      console.log('\n' + '='.repeat(60));
      console.log('📊 Processing: Mental Disorders Tables');
      console.log('='.repeat(60));
      const mentalTablesData = loadTableJSONL(mentalTablesPath);
      await uploadToPinecone(mentalTablesData, 'mental-disorders-tables');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Upload completed successfully!');
    console.log('='.repeat(60));
    console.log('\n💡 Usage examples:');
    console.log('  - Upload skin diseases only: node scripts/upload-to-pinecone.js skin');
    console.log('  - Upload mental disorders only: node scripts/upload-to-pinecone.js mental');
    console.log('  - Upload both main files: node scripts/upload-to-pinecone.js both');
    console.log('  - Upload skin tables: node scripts/upload-to-pinecone.js skin-tables');
    console.log('  - Upload mental tables: node scripts/upload-to-pinecone.js mental-tables');
    console.log('  - Upload all tables: node scripts/upload-to-pinecone.js tables');
    console.log('  - Upload everything: node scripts/upload-to-pinecone.js all');
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error);
    process.exit(1);
  }
}

// Run
main().catch(console.error);
