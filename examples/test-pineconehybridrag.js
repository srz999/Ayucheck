/**
 * Test Pinecone Hybrid RAG API
 * 
 * Tests the HYBRID implementation combining:
 * - Pinecone vector similarity search (semantic understanding)
 * - BM25 local keyword search (precise term matching)
 * - Query classification and expansion
 * - Adaptive hybrid scoring with fallback modes
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as readline from 'readline';

const API_URL = 'http://localhost:3000/api/pineconehybridrag';

// Test queries designed to test hybrid RAG capabilities
const testQueries = [
  {
    name: 'Herb Properties (Vector + Keyword)',
    query: 'What is the botanical name of Haridra and its microscopic characteristics?',
    expectedMode: 'hybrid',
    expectedFeatures: ['botanical name', 'microscopic', 'haridra', 'turmeric'],
  },
  {
    name: 'Skin Disease Treatment (Namespace Targeting)',
    query: 'What are the symptoms and Ayurvedic treatment for eczema or red skin rashes?',
    expectedMode: 'hybrid',
    expectedNamespace: 'skin-diseases',
    expectedFeatures: ['symptoms', 'treatment', 'dosha', 'eczema'],
  },
  {
    name: 'Mental Health Query (Mental Disorders Namespace)',
    query: 'How can I manage anxiety and stress using Ayurvedic herbs and practices?',
    expectedMode: 'hybrid',
    expectedNamespace: 'mental-disorders',
    expectedFeatures: ['anxiety', 'stress', 'herbs', 'practices'],
  },
  {
    name: 'Query Expansion Test',
    query: 'turmeric benefits',
    expectedMode: 'hybrid',
    expectedFeatures: ['haridra', 'curcuma', 'properties', 'benefits'],
  },
  {
    name: 'Cross-Namespace Query',
    query: 'What herbs help with both skin conditions and mental stress?',
    expectedMode: 'hybrid',
    expectedFeatures: ['herbs', 'skin', 'mental', 'stress'],
  },
  {
    name: 'Precise Terminology (BM25 Strength)',
    query: 'What is the pharmacopoeial standard for Ashwagandha root powder?',
    expectedMode: 'hybrid',
    expectedFeatures: ['pharmacopoeia', 'standard', 'ashwagandha', 'root'],
  },
];

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  console.log('🏥 Testing Hybrid RAG health check endpoint...\n');
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    console.log('✅ Health Check Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.status !== 'healthy' && data.status !== 'degraded') {
      console.error('⚠️ WARNING: System reports unhealthy status!');
      return false;
    }
    
    if (data.mode !== 'hybrid-rag') {
      console.error('❌ ERROR: Not in hybrid RAG mode! Found:', data.mode);
      return false;
    }
    
    console.log(`\n✅ Hybrid RAG System Status:`);
    console.log(`   - Capability: ${data.capability}`);
    console.log(`   - Pinecone: ${data.pinecone?.available ? '✓ Available' : '✗ Unavailable'}`);
    if (data.pinecone?.available) {
      console.log(`     - Index: ${data.pinecone.indexName}`);
      console.log(`     - Vectors: ${data.pinecone.vectorCount}`);
    }
    console.log(`   - Local Datasets: ${data.localDatasets?.available ? '✓ Available' : '✗ Unavailable'}`);
    if (data.localDatasets?.available) {
      console.log(`     - Count: ${data.localDatasets.count}`);
    }
    console.log(`   - Hybrid Scoring: ${data.configuration?.hybridScoring ? '✓ Enabled' : '✗ Disabled'}`);
    console.log(`   - HYBRID_ALPHA: ${data.configuration?.hybridAlpha} (${(data.configuration?.hybridAlpha * 100).toFixed(0)}% vector)`);
    console.log(`   - Query Expansion: ${data.configuration?.queryExpansion ? '✓ Enabled' : '✗ Disabled'}\n`);
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
  if (testCase.expectedMode) {
    console.log(`🎯 Expected mode: ${testCase.expectedMode}`);
  }
  if (testCase.expectedNamespace) {
    console.log(`🎯 Expected namespace: ${testCase.expectedNamespace}`);
  }
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

    // Check hybrid RAG-specific headers
    const ragMode = response.headers.get('X-RAG-Mode');
    const vectorResults = response.headers.get('X-Vector-Results');
    const localResults = response.headers.get('X-Local-Results');
    const hybridAlpha = response.headers.get('X-Hybrid-Alpha');
    const queryExpansions = response.headers.get('X-Query-Expansions');
    const namespacesSearched = response.headers.get('X-Namespaces-Searched');
    const docsFound = response.headers.get('X-Documents-Found');
    const processingTime = response.headers.get('X-Processing-Time-Ms');
    
    console.log('📊 Response Headers (Hybrid RAG):');
    console.log(`   - RAG Mode: ${ragMode}`);
    console.log(`   - Vector Results: ${vectorResults}`);
    console.log(`   - Local (BM25) Results: ${localResults}`);
    console.log(`   - Hybrid Alpha: ${hybridAlpha} (${(parseFloat(hybridAlpha || '0.7') * 100).toFixed(0)}% vector, ${((1 - parseFloat(hybridAlpha || '0.7')) * 100).toFixed(0)}% keyword)`);
    console.log(`   - Query Expansions: ${queryExpansions}`);
    console.log(`   - Namespaces Searched: ${namespacesSearched}`);
    console.log(`   - Documents Found: ${docsFound}`);
    console.log(`   - Processing Time: ${processingTime}ms`);
    
    // Validate hybrid-specific expectations
    if (testCase.expectedMode && ragMode !== testCase.expectedMode) {
      console.log(`   ⚠️  WARNING: Expected mode '${testCase.expectedMode}' but got '${ragMode}'`);
    }
    
    // For hybrid mode, both vector and local should have results
    if (ragMode === 'hybrid') {
      const vectorCount = parseInt(vectorResults || '0');
      const localCount = parseInt(localResults || '0');
      if (vectorCount === 0 || localCount === 0) {
        console.log(`   ⚠️  WARNING: Hybrid mode but missing results from one source (vector: ${vectorCount}, local: ${localCount})`);
      }
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
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const match = line.match(/^\d+:"(.*)"/);
          if (match) {
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
    
    // Analyze response quality with hybrid-specific checks
    const analysisResult = analyzeHybridResponse(fullResponse, testCase, {
      ragMode,
      vectorResults: parseInt(vectorResults || '0'),
      localResults: parseInt(localResults || '0'),
      hybridAlpha: parseFloat(hybridAlpha || '0.7'),
      queryExpansions: parseInt(queryExpansions || '1'),
    });
    
    // Determine pass/fail based on quality score
    const qualityThreshold = 70;
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
 * Analyze response quality for Hybrid RAG (STRICT VALIDATION)
 */
function analyzeHybridResponse(response, testCase, headers) {
  console.log('📊 Hybrid RAG Response Analysis (Strict Mode):');
  
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
  
  // Check for REQUIRED citations
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
    results.issues.push('CRITICAL: NO CITATIONS - Hybrid RAG must include citations!');
  }
  
  if (citations.length > 0) {
    console.log('   📚 Citation examples:');
    citations.slice(0, 3).forEach(cite => {
      console.log(`      - ${cite}`);
    });
  }
  
  // Hybrid-specific: Check if both sources contributed
  results.maxScore += 15;
  if (headers.ragMode === 'hybrid') {
    if (headers.vectorResults > 0 && headers.localResults > 0) {
      console.log(`   ✓ Hybrid mode: Both sources active (vector: ${headers.vectorResults}, BM25: ${headers.localResults})`);
      results.score += 15;
    } else {
      console.log(`   ⚠️ Hybrid mode but one source missing (vector: ${headers.vectorResults}, BM25: ${headers.localResults})`);
      results.score += 7;
      results.issues.push('Hybrid mode not utilizing both sources');
    }
  } else {
    console.log(`   ○ Non-hybrid mode: ${headers.ragMode} (${headers.vectorResults + headers.localResults} results)`);
    results.score += 12; // Partial credit for fallback modes
  }
  
  // Check for query expansion effectiveness
  results.maxScore += 10;
  if (headers.queryExpansions > 1) {
    console.log(`   ✓ Query expansion: ${headers.queryExpansions} variants (cost-effective recall boost)`);
    results.score += 10;
  } else {
    console.log(`   ○ Query expansion: disabled or single query`);
    results.score += 5;
  }
  
  // Check for Sanskrit terms
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
    results.issues.push('No Sanskrit terms');
  }
  
  // Check for expected features
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
    results.maxScore += 20;
    results.score += 20;
    console.log(`   ○ Expected features: N/A (manual query mode)`);
  }
  
  // Check for grounding phrases
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
    results.issues.push('No grounding phrases');
  }
  
  // Check for botanical names (BONUS)
  results.maxScore += 5;
  const botanicalPattern = /\([A-Z][a-z]+ [a-z]+(?:\s+[a-z]+)?\)/g;
  const botanicalMatches = response.match(botanicalPattern) || [];
  if (botanicalMatches.length > 0) {
    console.log(`   ✓ Botanical names: ${botanicalMatches.length} (excellent)`);
    results.score += 5;
  } else {
    console.log(`   ○ Botanical names: 0 (optional)`);
  }
  
  // Check for dosha mentions (BONUS)
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
  
  // Check for inappropriate refusals
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
    results.score = Math.floor(results.score * 0.5);
  } else {
    console.log(`   ✓ Not a refusal: Answered confidently`);
  }
  
  // Calculate final score
  const scorePercentage = (results.score / results.maxScore * 100).toFixed(1);
  console.log(`\n   📊 Quality Score: ${results.score}/${results.maxScore} (${scorePercentage}%)`);
  
  if (results.score < results.maxScore * 0.7) {
    results.passed = false;
    results.issues.push(`Quality score ${scorePercentage}% is below 70% threshold`);
  }
  
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
  
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.error('❌ Hybrid RAG system is not healthy.');
    return;
  }
  
  const testCase = {
    name: 'Manual Query',
    query: query,
    expectedFeatures: [],
  };
  
  await testQuery(testCase);
  
  console.log('='.repeat(80));
  console.log('\n💡 Evaluation Guide:');
  console.log('   - Check X-RAG-Mode header (hybrid/vector-only/local-only)');
  console.log('   - Verify both vector and BM25 results if in hybrid mode');
  console.log('   - Check if query expansion improved recall (X-Query-Expansions)');
  console.log('   - Verify namespace targeting (X-Namespaces-Searched)');
  console.log('   - Ensure citations are present and accurate');
  console.log('   - Look for Ayurvedic context (doshas, herbs, Sanskrit terms)\n');
}

/**
 * Interactive CLI mode
 */
async function interactiveMode() {
  console.log('🎯 Interactive Hybrid RAG Query Mode\n');
  console.log('='.repeat(80) + '\n');
  
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.error('❌ Hybrid RAG system is not healthy. Exiting.');
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
      
      const testCase = {
        name: 'Interactive Query',
        query: trimmedQuery,
        expectedFeatures: [],
      };
      
      await testQuery(testCase);
      console.log('─'.repeat(80) + '\n');
      
      askQuery();
    });
  };
  
  askQuery();
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return { mode: 'test-suite' };
  }
  
  const command = args[0];
  
  if (command === '--query' && args.length > 1) {
    return { mode: 'manual', query: args.slice(1).join(' ') };
  }
  
  if (command === '--interactive' || command === '-i') {
    return { mode: 'interactive' };
  }
  
  if (command === '--help' || command === '-h') {
    return { mode: 'help' };
  }
  
  // Assume everything is a query if no flag
  return { mode: 'manual', query: args.join(' ') };
}

/**
 * Main test execution
 */
async function main() {
  const config = parseArgs();
  
  if (config.mode === 'help') {
    console.log('Pinecone Hybrid RAG Test Suite\n');
    console.log('Usage:');
    console.log('  node test-pineconehybridrag.js                    # Run full test suite');
    console.log('  node test-pineconehybridrag.js --query "query"    # Test single query');
    console.log('  node test-pineconehybridrag.js --interactive      # Interactive mode');
    console.log('  node test-pineconehybridrag.js --help             # Show this help\n');
    console.log('Features:');
    console.log('  - Tests hybrid RAG (Pinecone vector + BM25 keyword)');
    console.log('  - Validates query classification and namespace targeting');
    console.log('  - Checks query expansion effectiveness');
    console.log('  - Analyzes hybrid scoring quality');
    console.log('  - Validates fallback modes (vector-only, local-only)\n');
    return;
  }
  
  if (config.mode === 'manual') {
    await testManualQuery(config.query);
    return;
  }
  
  if (config.mode === 'interactive') {
    await interactiveMode();
    return;
  }
  
  // Default: Run full test suite
  console.log('🧪 Pinecone Hybrid RAG Test Suite\n');
  console.log('='.repeat(80) + '\n');
  
  // Health check first
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.error('❌ System is not healthy. Cannot proceed with tests.\n');
    process.exit(1);
  }
  
  // Run all test cases
  let passedTests = 0;
  let totalTests = testQueries.length;
  
  for (const testCase of testQueries) {
    const passed = await testQuery(testCase);
    if (passed) {
      passedTests++;
    }
  }
  
  // Final summary
  console.log('='.repeat(80));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${(passedTests / totalTests * 100).toFixed(1)}%\n`);
  
  if (passedTests === totalTests) {
    console.log('✅ All tests passed!\n');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} test(s) failed. Review the results above.\n`);
  }
  
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);
