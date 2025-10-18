/**
 * Pure HTTP OpenAI Embedding Test
 * 
 * Basic example of creating embeddings using pure HTTP POST requests
 * No external libraries except built-in Node.js modules
 * Run with: node examples/test-embedding-http.js
 */

import https from 'https';
import dotenv from 'dotenv';

// Import .env.local variables
dotenv.config({ path: '.env.local' });

async function createEmbedding(text) {
  return new Promise((resolve, reject) => {
    // Prepare the request data
    const requestData = JSON.stringify({
      model: "text-embedding-ada-002",
      input: text,
      encoding_format: "float"
    });

    // Configure the HTTP request options
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'User-Agent': 'Node.js-HTTP-Client'
      }
    };

    console.log('🌐 Making HTTP POST request to:', `https://${options.hostname}${options.path}`);
    console.log('📤 Request headers:', JSON.stringify(options.headers, null, 2));
    console.log('📤 Request body:', requestData);

    // Create the HTTPS request
    const req = https.request(options, (res) => {
      let responseData = '';

      console.log(`📥 Response status: ${res.statusCode}`);
      console.log('📥 Response headers:', JSON.stringify(res.headers, null, 2));

      // Collect response data
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      // Handle response completion
      res.on('end', () => {
        try {
          const parsedResponse = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            resolve(parsedResponse);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsedResponse.error?.message || 'Unknown error'}`));
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}\nRaw response: ${responseData}`));
        }
      });
    });

    // Handle request errors
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    // Handle request timeout
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timed out after 30 seconds'));
    });

    // Send the request data
    req.write(requestData);
    req.end();
  });
}

async function main() {
  console.log('🚀 Creating OpenAI Embedding with Pure HTTP POST...\n');

  try {
    const startTime = Date.now();
    
    const embedding = await createEmbedding("The");
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n✅ Embedding created successfully!');
    console.log(`⏱️  HTTP Request Duration: ${duration}ms`);
    console.log(`📊 Model: ${embedding.model}`);
    console.log(`🔢 Dimension: ${embedding.data[0].embedding.length}`);
    console.log(`💰 Tokens: ${embedding.usage.total_tokens}`);
    console.log(`🎯 First 10 values: [${embedding.data[0].embedding.slice(0, 10).map(n => n.toFixed(6)).join(', ')}, ...]`);

    console.log('\n📦 Full HTTP response:');
    console.log(JSON.stringify(embedding, null, 2));

  } catch (error) {
    console.error('❌ HTTP Request Error:', error.message);
    
    if (error.message.includes('401')) {
      console.error('💡 Check your OPENAI_API_KEY in .env.local');
    } else if (error.message.includes('429')) {
      console.error('💡 Rate limit exceeded. Try again later.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('💡 Network connection issue. Check your internet connection.');
    }
  }
}

main();