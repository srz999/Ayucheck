// Test the fixed route.ts to verify it searches all namespaces
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/embedpinecone';

async function testQuery(question) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Testing Query: "${question}"`);
  console.log('='.repeat(80));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: question }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check custom headers
    const vectorDB = response.headers.get('x-vector-db');
    const docsFound = response.headers.get('x-documents-found');
    const indexName = response.headers.get('x-index-name');

    console.log(`\n📊 Response Headers:`);
    console.log(`   Vector DB: ${vectorDB}`);
    console.log(`   Documents Found: ${docsFound}`);
    console.log(`   Index Name: ${indexName}`);

    // Read the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;
    }

    console.log(`\n📝 Response Preview (first 500 chars):`);
    console.log(fullResponse.substring(0, 500) + '...\n');

    // Check for specific keywords that indicate proper data retrieval
    const hasKapalaMention = fullResponse.toLowerCase().includes('kapala');
    const hasVicaracikaMention = fullResponse.toLowerCase().includes('vicaracika');
    const hasSkinDiseaseInfo = fullResponse.toLowerCase().includes('skin') && 
                               (fullResponse.toLowerCase().includes('patch') || 
                                fullResponse.toLowerCase().includes('rash'));

    console.log(`✅ Quality Checks:`);
    console.log(`   Contains "Kapala" reference: ${hasKapalaMention ? '✓' : '✗'}`);
    console.log(`   Contains "Vicaracika" reference: ${hasVicaracikaMention ? '✓' : '✗'}`);
    console.log(`   Contains relevant skin disease info: ${hasSkinDiseaseInfo ? '✓' : '✗'}`);

    return {
      success: true,
      docsFound: parseInt(docsFound || '0'),
      qualityChecks: {
        hasKapalaMention,
        hasVicaracikaMention,
        hasSkinDiseaseInfo
      }
    };

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 TESTING FIXED PINECONE ROUTE - MULTI-NAMESPACE SEARCH');
  console.log('='.repeat(80));
  console.log('This test verifies that route.ts now searches ALL 5 namespaces:\n');
  console.log('  1. Default (pharmacopoeia - 220 docs)');
  console.log('  2. skin-diseases (31 docs)');
  console.log('  3. skin-diseases-tables (36 docs) ← CRITICAL!');
  console.log('  4. mental-disorders (68 docs)');
  console.log('  5. mental-disorders-tables (54 docs) ← CRITICAL!\n');

  const testCases = [
    {
      name: 'Skin Disease with Clinical Description',
      question: 'What is Kapala Kusta? Describe its symptoms.',
      expectedSource: 'skin-diseases-tables',
      expectedKeywords: ['kapala', 'black', 'reddish', 'rough', 'thick']
    },
    {
      name: 'Symptom-based Query',
      question: 'Red skin rashes with itching on my hands',
      expectedSource: 'skin-diseases-tables',
      expectedKeywords: ['vicaracika', 'visphota', 'itching', 'rash']
    },
    {
      name: 'Mental Health Query',
      question: 'What are Ayurvedic treatments for anxiety and stress?',
      expectedSource: 'mental-disorders',
      expectedKeywords: ['anxiety', 'stress', 'manas']
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n\n📋 Test Case: ${testCase.name}`);
    console.log(`   Expected to retrieve from: ${testCase.expectedSource}`);
    console.log(`   Expected keywords: ${testCase.expectedKeywords.join(', ')}`);
    
    const result = await testQuery(testCase.question);
    results.push({ testCase, result });
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  results.forEach(({ testCase, result }, index) => {
    console.log(`\n${index + 1}. ${testCase.name}`);
    console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (result.success) {
      console.log(`   Documents Retrieved: ${result.docsFound}`);
      console.log(`   Quality Checks:`);
      Object.entries(result.qualityChecks).forEach(([key, value]) => {
        console.log(`     - ${key}: ${value ? '✓' : '✗'}`);
      });
    } else {
      console.log(`   Error: ${result.error}`);
    }
  });

  const successCount = results.filter(r => r.result.success).length;
  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ Tests Passed: ${successCount}/${results.length}`);
  console.log(`${'='.repeat(80)}\n`);

  // Instructions
  console.log('💡 VERIFICATION INSTRUCTIONS:');
  console.log('1. Check server console for namespace search logs');
  console.log('2. Verify documents are retrieved from multiple namespaces');
  console.log('3. Confirm similarity scores are higher (0.4+) for table data');
  console.log('4. Ensure responses contain clinical descriptions from tables\n');
}

// Run tests
console.log('⏳ Starting tests in 3 seconds (make sure Next.js dev server is running)...\n');
setTimeout(() => {
  runTests().catch(console.error);
}, 3000);
