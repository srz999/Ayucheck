/**
 * Test Enhanced RAG API
 * 
 * Simple script to test the enhanced RAG endpoint with various queries
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const API_URL = 'http://localhost:3000/api/ayurveda-enhanced';

// Test queries covering different domains
const testQueries = [
  {
    name: 'Skin Disease Query',
    query: 'What are the symptoms and treatment for red skin rashes?',
    expectedDataset: 'ayu_skinDiseases_rag.json',
  },
  {
    name: 'Mental Health Query',
    query: 'How can I manage anxiety and stress using Ayurveda?',
    expectedDataset: 'ayu_mentalDisorders_rag.json',
  },
  {
    name: 'Herb Properties Query',
    query: 'What is the botanical name of Haridra and its microscopic characteristics?',
    expectedDataset: 'ayurcheck_rag.json',
  },
  {
    name: 'General Query',
    query: 'Tell me about Ayurvedic principles of balance',
    expectedDataset: 'multiple datasets',
  },
];

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  console.log('🏥 Testing health check endpoint...\n');
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    console.log('✅ Health Check Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n---\n');
    
    return data.status === 'healthy';
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

/**
 * Test chat endpoint with a query
 */
async function testQuery(testCase) {
  console.log(`🧪 Testing: ${testCase.name}`);
  console.log(`📝 Query: "${testCase.query}"`);
  console.log(`🎯 Expected dataset: ${testCase.expectedDataset}\n`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: testCase.query }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Request failed:', errorData);
      return false;
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      fullResponse += chunk;
    }

    console.log('✅ Response received:');
    console.log(fullResponse.substring(0, 500) + '...\n');
    
    // Analyze response
    analyzeResponse(fullResponse, testCase);
    
    console.log('---\n');
    return true;
  } catch (error) {
    console.error('❌ Query test failed:', error.message);
    return false;
  }
}

/**
 * Analyze response quality
 */
function analyzeResponse(response, testCase) {
  console.log('📊 Response Analysis:');
  
  // Check response length
  console.log(`   - Length: ${response.length} characters`);
  
  // Check for citations
  const citations = response.match(/\[Source:[^\]]+\]/g) || [];
  console.log(`   - Citations found: ${citations.length}`);
  
  // Check for Sanskrit terms
  const sanskritPattern = /\b[A-Z][a-z]+(?:a|i|u)\b/;
  const hasSanskrit = sanskritPattern.test(response);
  console.log(`   - Contains Sanskrit terms: ${hasSanskrit ? 'Yes' : 'No'}`);
  
  // Check for grounding phrases
  const groundingPhrases = [
    'according to the text',
    'based on the context',
    'from the knowledge base',
    'as stated in',
  ];
  const hasGrounding = groundingPhrases.some(phrase => 
    response.toLowerCase().includes(phrase)
  );
  console.log(`   - Grounding phrases: ${hasGrounding ? 'Yes' : 'No'}`);
  
  // Check for refusal (low confidence)
  const refusalPhrases = [
    'don\'t have specific information',
    'not contain information',
    'consult a practitioner',
  ];
  const isRefusal = refusalPhrases.some(phrase => 
    response.toLowerCase().includes(phrase)
  );
  console.log(`   - Refused to answer: ${isRefusal ? 'Yes' : 'No'}`);
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Enhanced RAG API Tests\n');
  console.log('='.repeat(60) + '\n');
  
  // Test health check
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.error('❌ System is not healthy. Aborting tests.');
    return;
  }
  
  // Test each query
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testQueries) {
    const success = await testQuery(testCase);
    if (success) {
      passed++;
    } else {
      failed++;
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('\n📈 Test Summary:');
  console.log(`   ✅ Passed: ${passed}/${testQueries.length}`);
  console.log(`   ❌ Failed: ${failed}/${testQueries.length}`);
  console.log(`   📊 Success Rate: ${(passed / testQueries.length * 100).toFixed(1)}%\n`);
}

// Run tests if executed directly (ES module compatible)
// In ES modules, check if this file is the entry point
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is the main module being run
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runTests().catch(console.error);
}

// ES module exports
export { testHealthCheck, testQuery, runTests };
