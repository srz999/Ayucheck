// Test Pinecone search across different namespaces
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

// Initialize clients
const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function testSearch() {
  console.log('🧪 Testing Pinecone Search Across Namespaces\n');
  console.log('=' .repeat(70));
  
  try {
    const index = pc.index(PINECONE_INDEX_NAME);
    
    // First, check index stats
    console.log('\n📊 Index Statistics:');
    console.log('=' .repeat(70));
    const stats = await index.describeIndexStats();
    console.log(JSON.stringify(stats, null, 2));
    
    // Test query about skin diseases
    const testQuery = "Red skin rashes with itching on my hands";
    console.log(`\n🔍 Test Query: "${testQuery}"`);
    console.log('=' .repeat(70));
    
    // Generate embedding for test query
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testQuery,
      encoding_format: 'float'
    });
    const queryEmbedding = response.data[0].embedding;
    
    // Define all namespaces to test
    const namespaces = [
      { name: '', label: 'Default (ayurcheck_rag.jsonl - pharmacopoeia)' },
      { name: 'skin-diseases', label: 'Skin Diseases RAG' },
      { name: 'skin-diseases-tables', label: 'Skin Diseases Tables' },
      { name: 'mental-disorders', label: 'Mental Disorders RAG' },
      { name: 'mental-disorders-tables', label: 'Mental Disorders Tables' },
    ];
    
    // Search each namespace
    for (const ns of namespaces) {
      console.log(`\n🔍 Searching Namespace: "${ns.name || 'default'}" (${ns.label})`);
      console.log('-'.repeat(70));
      
      try {
        const searchResponse = await index.namespace(ns.name).query({
          vector: queryEmbedding,
          topK: 3,
          includeValues: false,
          includeMetadata: true,
        });
        
        if (searchResponse.matches && searchResponse.matches.length > 0) {
          console.log(`✅ Found ${searchResponse.matches.length} results:`);
          searchResponse.matches.forEach((match, idx) => {
            console.log(`\n   ${idx + 1}. ID: ${match.id}`);
            console.log(`      Score: ${match.score?.toFixed(4)}`);
            console.log(`      Text Preview: ${(match.metadata?.text || match.metadata?.content || 'N/A').substring(0, 150)}...`);
            console.log(`      Metadata: ${JSON.stringify({
              type: match.metadata?.type,
              page: match.metadata?.page,
              source: match.metadata?.source
            })}`);
          });
        } else {
          console.log('❌ No results found in this namespace');
        }
      } catch (error) {
        console.log(`❌ Error searching namespace: ${error.message}`);
      }
    }
    
    // Now test the CURRENT route.ts behavior (no namespace specified)
    console.log('\n\n🚨 CURRENT ROUTE.TS BEHAVIOR (No Namespace Specified):');
    console.log('=' .repeat(70));
    const currentBehavior = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeValues: false,
      includeMetadata: true,
    });
    
    console.log(`📊 Results: ${currentBehavior.matches?.length || 0} documents`);
    currentBehavior.matches?.forEach((match, idx) => {
      console.log(`\n   ${idx + 1}. Score: ${match.score?.toFixed(4)}`);
      console.log(`      ID: ${match.id}`);
      console.log(`      Text: ${(match.metadata?.text || match.metadata?.content || 'N/A').substring(0, 150)}...`);
    });
    
    console.log('\n\n' + '=' .repeat(70));
    console.log('🎯 ANALYSIS:');
    console.log('=' .repeat(70));
    console.log('❌ PROBLEM: route.ts only searches the DEFAULT namespace');
    console.log('✅ SOLUTION: Search across ALL namespaces and combine results');
    console.log('\n📝 Namespaces with data:');
    Object.keys(stats.namespaces || {}).forEach(ns => {
      console.log(`   - "${ns || 'default'}": ${stats.namespaces[ns].recordCount} vectors`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testSearch().catch(console.error);
