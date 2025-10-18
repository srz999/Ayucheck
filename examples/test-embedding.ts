/**
 * OpenAI Embedding Test - TypeScript Learning Example
 * 
 * This file demonstrates how to create embeddings using the plain OpenAI SDK
 * with TypeScript for educational purposes.
 * 
 * Run with: npx tsx examples/test-embedding.ts
 */

import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Type definitions for better understanding
interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function createSingleEmbedding(text: string): Promise<EmbeddingResponse> {
  console.log(`🔧 Creating embedding for: "${text.substring(0, 50)}..."`);
  
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
    encoding_format: "float",
  });

  return response as EmbeddingResponse;
}

async function createBatchEmbeddings(texts: string[]): Promise<EmbeddingResponse> {
  console.log(`🔧 Creating batch embeddings for ${texts.length} texts`);
  
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: texts,
    encoding_format: "float",
  });

  return response as EmbeddingResponse;
}

function analyzeEmbedding(embedding: number[], label: string = "Embedding"): void {
  console.log(`📊 ${label} Analysis:`);
  console.log(`   - Dimension: ${embedding.length}`);
  console.log(`   - Min value: ${Math.min(...embedding).toFixed(6)}`);
  console.log(`   - Max value: ${Math.max(...embedding).toFixed(6)}`);
  console.log(`   - Average: ${(embedding.reduce((a, b) => a + b, 0) / embedding.length).toFixed(6)}`);
  console.log(`   - First 5: [${embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}]`);
  console.log(`   - Last 5: [${embedding.slice(-5).map(n => n.toFixed(4)).join(', ')}]`);
}

function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

async function main(): Promise<void> {
  console.log('🚀 TypeScript OpenAI Embeddings Learning Example\n');

  try {
    // Test 1: Basic embedding
    console.log('📝 Test 1: Basic Single Text Embedding');
    const text1 = "The quick brown fox jumped over the lazy dog";
    
    const startTime1 = Date.now();
    const result1 = await createSingleEmbedding(text1);
    const endTime1 = Date.now();

    console.log(`⏱️  Duration: ${endTime1 - startTime1}ms`);
    console.log(`💰 Tokens used: ${result1.usage.total_tokens}`);
    analyzeEmbedding(result1.data[0].embedding, "Basic Text");
    console.log('\n' + '='.repeat(80) + '\n');

    // Test 2: Medical/Ayurvedic content
    console.log('📝 Test 2: Ayurvedic Content Embedding');
    const ayurvedicTexts = [
      "Turmeric (Curcuma longa) has powerful anti-inflammatory and antioxidant properties",
      "Ashwagandha is an adaptogenic herb that helps reduce stress and anxiety",
      "Triphala is a traditional Ayurvedic formulation consisting of three fruits",
      "Pranayama breathing techniques help balance the nervous system"
    ];

    const startTime2 = Date.now();
    const result2 = await createBatchEmbeddings(ayurvedicTexts);
    const endTime2 = Date.now();

    console.log(`⏱️  Duration: ${endTime2 - startTime2}ms`);
    console.log(`💰 Total tokens used: ${result2.usage.total_tokens}`);
    
    result2.data.forEach((item, index) => {
      console.log(`\n📋 Text ${index + 1}: "${ayurvedicTexts[index]}"`);
      analyzeEmbedding(item.embedding, `Ayurvedic Text ${index + 1}`);
    });

    // Test 3: Similarity comparison
    console.log('\n' + '='.repeat(80));
    console.log('📊 Similarity Analysis');
    
    const similarities: Array<{texts: [string, string], similarity: number}> = [];
    
    for (let i = 0; i < result2.data.length; i++) {
      for (let j = i + 1; j < result2.data.length; j++) {
        const similarity = calculateCosineSimilarity(
          result2.data[i].embedding,
          result2.data[j].embedding
        );
        
        similarities.push({
          texts: [ayurvedicTexts[i], ayurvedicTexts[j]],
          similarity: similarity
        });
      }
    }

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);

    console.log('\n🔍 Most Similar Pairs:');
    similarities.slice(0, 3).forEach((item, index) => {
      console.log(`${index + 1}. Similarity: ${item.similarity.toFixed(4)}`);
      console.log(`   Text A: "${item.texts[0]}"`);
      console.log(`   Text B: "${item.texts[1]}"\n`);
    });

    console.log('🔍 Least Similar Pairs:');
    similarities.slice(-2).forEach((item, index) => {
      console.log(`${index + 1}. Similarity: ${item.similarity.toFixed(4)}`);
      console.log(`   Text A: "${item.texts[0]}"`);
      console.log(`   Text B: "${item.texts[1]}"\n`);
    });

    console.log('✅ All TypeScript embedding tests completed successfully!');

  } catch (error: any) {
    console.error('❌ Error in embedding test:', error);
    
    if (error?.code === 'invalid_api_key') {
      console.error('💡 Check your OPENAI_API_KEY in .env.local');
    } else if (error?.status === 429) {
      console.error('💡 Rate limit reached. Wait a moment and try again.');
    } else {
      console.error('💡 Full error details:', error);
    }
  }
}

// Export functions for potential reuse
export {
  createSingleEmbedding,
  createBatchEmbeddings,
  analyzeEmbedding,
  calculateCosineSimilarity
};

// Run the main function
main().catch(console.error);