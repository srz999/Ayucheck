/**
 * Simple OpenAI Embedding Test
 * 
 * Basic example of creating embeddings using the OpenAI SDK
 * Run with: node examples/test-embedding.js
 */

import OpenAI from "openai";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  console.log('🚀 Creating OpenAI Embedding...\n');

  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: "The",
      encoding_format: "float",

    });


    console.log('✅ Embedding created successfully!');
    console.log(`📊 Model: ${embedding.model}`);
    console.log(`🔢 Dimension: ${embedding.data[0].embedding.length}`);
    //console.log(`💰 Tokens: ${embedding.usage.total_tokens}`);
    console.log(`🎯 First 10 values: [${embedding.data[0].embedding.slice(0, 10).map(n => n.toFixed(6)).join(', ')}, ...]`);

    console.log('\n📦 Full response:');
    console.log(JSON.stringify(embedding, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();