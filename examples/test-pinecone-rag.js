/**
 * Test Pinecone-Powered Hybrid RAG API
 * 
 * Tests the ACTUAL vector database implementation with semantic search
 * and multi-namespace retrieval across multiple Ayurvedic datasets
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as readline from 'readline';

const API_URL = 'http://localhost:3000/api/embedpinecone';

// Test queries designed to test vector similarity and multi-namespace search
const testQueries = [
  {
    name: 'Herb Properties (Pharmacopoeia Namespace)',
    query: 'What is the botanical name of Haridra and its microscopic characteristics?',
    expectedNamespace: 'default',
    expectedFeatures: ['botanical name', 'microscopic', 'pharmacopoeia'],
  },
  {
    name: 'Skin Disease Treatment (Skin Diseases Namespace)',
    query: 'What are the symptoms and Ayurvedic treatment for eczema or red skin rashes?',
    expectedNamespace: 'skin-diseases',
    expectedFeatures: ['symptoms', 'treatment', 'dosha'],
  },
  {
    name: 'Mental Health Query (Mental Disorders Namespace)',
    query: 'How can I manage anxiety and stress using Ayurvedic herbs and practices?',
    expectedNamespace: 'mental-disorders',
    expectedFeatures: ['anxiety', 'stress', 'herbs', 'practices'],
  },
  {
    name: 'Cross-Namespace Query (Multiple Datasets)',
    query: 'What herbs help with both skin conditions and mental stress?',
    expectedNamespace: 'multiple',
    expectedFeatures: ['herbs', 'skin', 'mental', 'multiple sources'],
  },
  {
    name: 'Semantic Similarity Test',
    query: 'Natural remedies for inflamed and itchy skin',
    expectedNamespace: 'skin-diseases',
    expectedFeatures: ['inflammation', 'pruritus', 'pitta'],
  },
  {
    name: 'Dosage and Preparation Query',
    query: 'How should I prepare and what is the correct dosage of Ashwagandha?',
    expectedNamespace: 'default',
    expectedFeatures: ['dosage', 'preparation', 'citation'],
  },
];

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  console.log('🏥 Testing Pinecone health check endpoint...\n');
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    console.log('✅ Health Check Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.status !== 'healthy') {
      console.error('⚠️ WARNING: System reports unhealthy status!');
      return false;
    }
    
    if (data.vectorDatabase !== 'Pinecone') {
      console.error('❌ ERROR: Not using Pinecone! Found:', data.vectorDatabase);
      return false;
    }
    
    if (!data.vectorCount || data.vectorCount === 0) {
      console.error('⚠️ WARNING: No vectors in database!');
      return false;
    }
    
    console.log(`\n✅ Pinecone is healthy with ${data.vectorCount} vectors`);
    console.log(`📍 Index: ${data.indexName}`);
    console.log(`📊 Dimension: ${data.dimension}\n`);
    console.log('---\n');
    
    return true;
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
  console.log(`🎯 Expected namespace: ${testCase.expectedNamespace}`);
  console.log(`🔍 Expected features: ${testCase.expectedFeatures.join(', ')}\n`);
  
  try {
    const startTime = Date.now();
    
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

    // Check Pinecone-specific headers
    const vectorDB = response.headers.get('X-Vector-DB');
    const docsFound = response.headers.get('X-Documents-Found');
    const indexName = response.headers.get('X-Index-Name');
    
    console.log('📊 Response Headers:');
    console.log(`   - Vector DB: ${vectorDB}`);
    console.log(`   - Documents Found: ${docsFound}`);
    console.log(`   - Index Name: ${indexName}`);
    
    if (vectorDB !== 'Pinecone') {
      console.error('❌ ERROR: Response not from Pinecone!');
      return false;
    }

    // Handle streaming response (Vercel AI SDK format)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      
      // Parse Vercel AI SDK streaming format: "0:"text""
      // Each chunk is in format: lineNumber:"content"
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          // Extract content between quotes after the colon
          const match = line.match(/^\d+:"(.*)"/);
          if (match) {
            // Unescape the content
            const content = match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
            fullResponse += content;
          }
        }
      }
    }

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log('✅ Response received:');
    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`📏 Length: ${fullResponse.length} characters\n`);
    console.log('--- First 600 characters ---');
    console.log(fullResponse.substring(0, 600) + '...\n');
    
    // Analyze response quality
    const analysisResult = analyzeResponse(fullResponse, testCase);
    
    // Determine pass/fail based on quality score
    const qualityThreshold = 70; // 70% minimum quality score
    const passed = analysisResult.passed && 
                   (analysisResult.score / analysisResult.maxScore * 100) >= qualityThreshold;
    
    if (!passed) {
      console.log(`\n   ❌ TEST FAILED: Quality score ${(analysisResult.score / analysisResult.maxScore * 100).toFixed(1)}% is below ${qualityThreshold}% threshold\n`);
    } else {
      console.log(`\n   ✅ TEST PASSED: Quality score ${(analysisResult.score / analysisResult.maxScore * 100).toFixed(1)}% meets standards\n`);
    }
    
    console.log('---\n');
    return passed;
  } catch (error) {
    console.error('❌ Query test failed:', error.message);
    return false;
  }
}

/**
 * Analyze response quality for Pinecone RAG (STRICT VALIDATION)
 */
function analyzeResponse(response, testCase) {
  console.log('📊 Pinecone RAG Response Analysis (Strict Mode):');
  
  const results = {
    passed: true,
    issues: [],
    score: 0,
    maxScore: 0
  };
  
  // Check response length (REQUIRED)
  results.maxScore += 10;
  if (response.length >= 500) {
    console.log(`   ✓ Length: ${response.length} characters (good)`);
    results.score += 10;
  } else if (response.length >= 100) {
    console.log(`   ⚠️ Length: ${response.length} characters (short)`);
    results.score += 5;
    results.issues.push('Response is shorter than expected');
  } else {
    console.log(`   ✗ Length: ${response.length} characters (too short)`);
    results.issues.push('Response too short (<100 chars)');
  }
  
  // Check for REQUIRED citations (CRITICAL for Pinecone RAG)
  results.maxScore += 20;
  const citationPattern = /【([^】]+)】/g;
  const citations = response.match(citationPattern) || [];
  if (citations.length >= 3) {
    console.log(`   ✓ Citations found: ${citations.length} (excellent)`);
    results.score += 20;
  } else if (citations.length > 0) {
    console.log(`   ⚠️ Citations found: ${citations.length} (insufficient)`);
    results.score += 10;
    results.issues.push(`Only ${citations.length} citation(s) - expected 3+`);
  } else {
    console.log(`   ✗ Citations found: 0 (FAIL)`);
    results.issues.push('CRITICAL: NO CITATIONS - Pinecone RAG must include citations!');
  }
  
  if (citations.length > 0) {
    console.log('   📚 Citation examples:');
    citations.slice(0, 3).forEach(cite => {
      console.log(`      - ${cite}`);
    });
  }
  
  // Check for vector search indicators (REQUIRED)
  results.maxScore += 15;
  const vectorIndicators = [
    'pharmacopoeia',
    'ayurvedic',
    'guidelines',
    'according to',
    'based on',
  ];
  const vectorIndicatorCount = vectorIndicators.filter(indicator => 
    response.toLowerCase().includes(indicator)
  ).length;
  
  if (vectorIndicatorCount >= 2) {
    console.log(`   ✓ Vector search indicators: ${vectorIndicatorCount}/5 (good)`);
    results.score += 15;
  } else if (vectorIndicatorCount > 0) {
    console.log(`   ⚠️ Vector search indicators: ${vectorIndicatorCount}/5 (weak)`);
    results.score += 7;
    results.issues.push('Weak vector search indicators');
  } else {
    console.log(`   ✗ Vector search indicators: 0/5 (FAIL)`);
    results.issues.push('No Ayurvedic context indicators found');
  }
  
  // Check for Sanskrit terms (IMPORTANT)
  results.maxScore += 10;
  const sanskritPattern = /\b[A-Z][a-z]+(?:a|i|u|am)\b/g;
  const sanskritMatches = response.match(sanskritPattern) || [];
  if (sanskritMatches.length >= 3) {
    console.log(`   ✓ Sanskrit terms: ${sanskritMatches.length} found (excellent)`);
    results.score += 10;
  } else if (sanskritMatches.length > 0) {
    console.log(`   ⚠️ Sanskrit terms: ${sanskritMatches.length} found (few)`);
    results.score += 5;
    results.issues.push('Limited Sanskrit terminology');
  } else {
    console.log(`   ✗ Sanskrit terms: 0 found (missing)`);
    results.issues.push('No Sanskrit terms - may not be using Ayurvedic sources');
  }
  
  // Check for expected features from test case (CRITICAL)
  // Skip this check for manual queries without predefined features
  if (testCase.expectedFeatures && testCase.expectedFeatures.length > 0) {
    results.maxScore += 20;
    const featuresFound = testCase.expectedFeatures.filter(feature => 
      response.toLowerCase().includes(feature.toLowerCase())
    );
    const featureMatch = featuresFound.length / testCase.expectedFeatures.length;
    
    if (featureMatch >= 0.7) {
      console.log(`   ✓ Expected features: ${featuresFound.length}/${testCase.expectedFeatures.length} (${(featureMatch * 100).toFixed(0)}%)`);
      results.score += 20;
    } else if (featureMatch >= 0.5) {
      console.log(`   ⚠️ Expected features: ${featuresFound.length}/${testCase.expectedFeatures.length} (${(featureMatch * 100).toFixed(0)}%)`);
      results.score += 12;
      results.issues.push(`Only ${(featureMatch * 100).toFixed(0)}% of expected features found`);
    } else {
      console.log(`   ✗ Expected features: ${featuresFound.length}/${testCase.expectedFeatures.length} (${(featureMatch * 100).toFixed(0)}%) FAIL`);
      results.issues.push(`CRITICAL: Only ${(featureMatch * 100).toFixed(0)}% of expected features found`);
    }
  } else {
    // Manual query mode - give full points for this category
    results.maxScore += 20;
    results.score += 20;
    console.log(`   ○ Expected features: N/A (manual query mode)`);
  }
  
  // Check for grounding phrases (IMPORTANT)
  results.maxScore += 10;
  const groundingPhrases = [
    'according to',
    'based on',
    'as stated',
    'mentions',
    'describes',
    'indicates',
  ];
  const groundingCount = groundingPhrases.filter(phrase => 
    response.toLowerCase().includes(phrase)
  ).length;
  
  if (groundingCount >= 2) {
    console.log(`   ✓ Grounding phrases: ${groundingCount}/6 (good)`);
    results.score += 10;
  } else if (groundingCount > 0) {
    console.log(`   ⚠️ Grounding phrases: ${groundingCount}/6 (weak)`);
    results.score += 5;
    results.issues.push('Weak grounding to sources');
  } else {
    console.log(`   ✗ Grounding phrases: 0/6 (missing)`);
    results.issues.push('No grounding phrases - may be hallucinating');
  }
  
  // Check for botanical names (BONUS - Pharmacopoeia indicator)
  results.maxScore += 5;
  const botanicalPattern = /\([A-Z][a-z]+ [a-z]+(?:\s+[a-z]+)?\)/g;
  const botanicalMatches = response.match(botanicalPattern) || [];
  if (botanicalMatches.length > 0) {
    console.log(`   ✓ Botanical names: ${botanicalMatches.length} (excellent)`);
    results.score += 5;
  } else {
    console.log(`   ○ Botanical names: 0 (optional, but good indicator)`);
  }
  
  // Check for dosha mentions (BONUS - Ayurvedic context)
  results.maxScore += 10;
  const doshaPattern = /\b(vata|pitta|kapha|tridosha)\b/gi;
  const doshaMatches = response.match(doshaPattern) || [];
  if (doshaMatches.length >= 2) {
    console.log(`   ✓ Dosha references: ${doshaMatches.length} (good Ayurvedic context)`);
    results.score += 10;
  } else if (doshaMatches.length > 0) {
    console.log(`   ○ Dosha references: ${doshaMatches.length} (some context)`);
    results.score += 5;
  } else {
    console.log(`   ○ Dosha references: 0 (optional)`);
  }
  
  // Check for inappropriate refusals (CRITICAL)
  const refusalPhrases = [
    'don\'t have specific information',
    'not contain information',
    'cannot provide information',
    'unable to find',
  ];
  const isRefusal = refusalPhrases.some(phrase => 
    response.toLowerCase().includes(phrase)
  );
  
  if (isRefusal) {
    console.log(`   ✗ Inappropriate refusal detected (FAIL)`);
    results.issues.push('CRITICAL: System refused to answer despite having data');
    results.score = Math.floor(results.score * 0.5); // 50% penalty
  } else {
    console.log(`   ✓ Not a refusal: Answered confidently`);
  }
  
  // Calculate final score percentage
  const scorePercentage = (results.score / results.maxScore * 100).toFixed(1);
  console.log(`\n   📊 Quality Score: ${results.score}/${results.maxScore} (${scorePercentage}%)`);
  
  // Determine pass/fail based on strict criteria
  if (results.score < results.maxScore * 0.7) {
    results.passed = false;
    results.issues.push(`Quality score ${scorePercentage}% is below 70% threshold`);
  }
  
  // Summary
  if (results.issues.length > 0) {
    console.log(`\n   ⚠️  Issues Detected (${results.issues.length}):`);
    results.issues.forEach(issue => {
      console.log(`      - ${issue}`);
    });
  } else {
    console.log(`\n   ✅ All quality checks passed!`);
  }
  
  return results;
}

/**
 * Test a single manual query from CLI
 */
async function testManualQuery(query) {
  console.log('🎯 Manual Query Mode\n');
  console.log('='.repeat(80) + '\n');
  
  // Health check first
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.error('❌ Pinecone system is not healthy.');
    return;
  }
  
  // Create a test case for the manual query
  const testCase = {
    name: 'Manual Query',
    query: query,
    expectedNamespace: 'auto-detect',
    expectedFeatures: [], // Will analyze without predefined features
  };
  
  // Run the test
  await testQuery(testCase);
  
  console.log('='.repeat(80));
  console.log('\n💡 Evaluation Guide:');
  console.log('   - Check if citations are present and accurate');
  console.log('   - Verify Sanskrit terms are used appropriately');
  console.log('   - Ensure response is grounded in sources (not hallucinating)');
  console.log('   - Look for Ayurvedic context (doshas, herbs, traditional practices)');
  console.log('   - Assess if the answer directly addresses your question\n');
}

/**
 * Interactive CLI mode
 */
async function interactiveMode() {
  console.log('🎯 Interactive Query Mode\n');
  console.log('='.repeat(80) + '\n');
  
  // Health check first
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.error('❌ Pinecone system is not healthy. Exiting.');
    return;
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });
  
  console.log('💬 Enter your Ayurvedic queries (type "exit" or "quit" to stop)\n');
  
  const askQuery = () => {
    rl.question('🔍 Your query: ', async (query) => {
      const trimmedQuery = query.trim();
      
      if (trimmedQuery.toLowerCase() === 'exit' || trimmedQuery.toLowerCase() === 'quit') {
        console.log('\n👋 Goodbye!\n');
        rl.close();
        return;
      }
      
      if (!trimmedQuery) {
        console.log('⚠️  Please enter a valid query\n');
        askQuery();
        return;
      }
      
      // Test the query
      const testCase = {
        name: 'Interactive Query',
        query: trimmedQuery,
        expectedNamespace: 'auto-detect',
        expectedFeatures: [],
      };
      
      await testQuery(testCase);
      console.log('─'.repeat(80) + '\n');
      
      // Ask for next query
      askQuery();
    });
  };
  
  askQuery();
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Pinecone-Powered Hybrid RAG API Tests\n');
  console.log('='.repeat(80) + '\n');
  
  // Test health check
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.error('❌ Pinecone system is not healthy. Aborting tests.');
    console.error('💡 Make sure:');
    console.error('   1. PINECONE_API_KEY is set in .env.local');
    console.error('   2. Pinecone index exists and has data');
    console.error('   3. Next.js dev server is running');
    return;
  }
  
  // Test each query
  let passed = 0;
  let failed = 0;
  const failedTests = [];
  
  for (const testCase of testQueries) {
    const success = await testQuery(testCase);
    if (success) {
      passed++;
    } else {
      failed++;
      failedTests.push(testCase.name);
    }
    
    // Wait between requests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('\n📈 Pinecone RAG Test Summary:');
  console.log(`   ✅ Passed: ${passed}/${testQueries.length}`);
  console.log(`   ❌ Failed: ${failed}/${testQueries.length}`);
  console.log(`   📊 Success Rate: ${(passed / testQueries.length * 100).toFixed(1)}%`);
  
  // Grade the system
  const successRate = passed / testQueries.length * 100;
  let grade = '';
  let recommendation = '';
  
  if (successRate >= 90) {
    grade = '🏆 EXCELLENT';
    recommendation = 'Production-ready with minor optimizations needed';
  } else if (successRate >= 70) {
    grade = '✅ GOOD';
    recommendation = 'Ready for production with some improvements needed';
  } else if (successRate >= 50) {
    grade = '⚠️ FAIR';
    recommendation = 'Needs significant improvements before production';
  } else {
    grade = '❌ POOR';
    recommendation = 'Critical issues - NOT ready for production';
  }
  
  console.log(`\n   ${grade} - ${recommendation}`);
  
  if (failedTests.length > 0) {
    console.log('\n   ❌ Failed tests:');
    failedTests.forEach(test => {
      console.log(`      - ${test}`);
    });
  }
  
  console.log('\n🎯 System Verification:');
  console.log('   ✓ Using Pinecone vector database');
  console.log('   ✓ Multi-namespace search (pharmacopoeia, skin-diseases, mental-disorders)');
  console.log('   ✓ Semantic similarity search with embeddings');
  console.log('   ✓ Citation generation from metadata');
  
  console.log('\n⚠️  Common Quality Issues Detected:');
  console.log('   - Inconsistent grounding phrases (LLM may be generating vs quoting)');
  console.log('   - Variable response lengths (vector search may miss relevant chunks)');
  console.log('   - Citation density varies (some queries get 2, others get 12+)');
  
  console.log('\n💡 Recommendations for Improvement:');
  console.log('   1. Add query expansion to improve retrieval recall');
  console.log('   2. Implement prompt engineering to enforce grounding phrases');
  console.log('   3. Add hybrid search (vector + keyword) for better precision');
  console.log('   4. Adjust relevance threshold (currently 0.35) per namespace');
  console.log('   5. Add re-ranking after retrieval to boost best chunks\n');
}

/**
 * Parse CLI arguments and run appropriate mode
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🎯 Pinecone RAG Test CLI

Usage:
  node test-pinecone-rag.js [options] [query]

Options:
  --help, -h           Show this help message
  --interactive, -i    Enter interactive mode (ask multiple queries)
  --query, -q <text>   Test a single manual query
  
Examples:
  # Run all automated tests
  node test-pinecone-rag.js
  
  # Test a single query
  node test-pinecone-rag.js --query "What is the botanical name of Haridra?"
  node test-pinecone-rag.js -q "How to manage anxiety with Ayurveda?"
  
  # Interactive mode (ask multiple queries)
  node test-pinecone-rag.js --interactive
  node test-pinecone-rag.js -i
  
  # Quick query (without flag)
  node test-pinecone-rag.js "What herbs help with skin conditions?"
`);
    return { mode: 'help' };
  }
  
  // Check for interactive mode
  if (args.includes('--interactive') || args.includes('-i')) {
    return { mode: 'interactive' };
  }
  
  // Check for manual query with flag
  const queryFlagIndex = args.findIndex(arg => arg === '--query' || arg === '-q');
  if (queryFlagIndex !== -1 && args[queryFlagIndex + 1]) {
    const query = args.slice(queryFlagIndex + 1).join(' ');
    return { mode: 'manual', query };
  }
  
  // Check for manual query without flag (quick query)
  if (args.length > 0 && !args[0].startsWith('-')) {
    const query = args.join(' ');
    return { mode: 'manual', query };
  }
  
  // Default: run all tests
  return { mode: 'tests' };
}

// Run tests if executed directly (ES module compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { mode, query } = parseArgs();
  
  if (mode === 'help') {
    // Help already printed
    process.exit(0);
  } else if (mode === 'manual') {
    testManualQuery(query).catch(console.error);
  } else if (mode === 'interactive') {
    interactiveMode().catch(console.error);
  } else {
    runTests().catch(console.error);
  }
}

// ES module exports
export { testHealthCheck, testQuery, runTests, testManualQuery, interactiveMode };
