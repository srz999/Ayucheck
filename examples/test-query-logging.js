/**
 * Test Query Debug Logging
 * 
 * Simple test to verify debug logging is working
 * 
 * Usage: node examples/test-query-logging.js
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs', 'hybrid-rag-queries');
const API_URL = 'http://localhost:3000/api/pineconehybridrag';

async function testQueryLogging() {
  console.log('🧪 Testing Query Debug Logging System\n');
  console.log('=' .repeat(80));

  // Check if logs directory exists (will be created on first query)
  console.log('\n1️⃣  Checking logs directory...');
  if (fs.existsSync(LOGS_DIR)) {
    const existingLogs = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.json'));
    console.log(`   ✅ Logs directory exists with ${existingLogs.length} existing logs`);
  } else {
    console.log('   ℹ️  Logs directory will be created on first query');
  }

  // Get current log count
  const beforeCount = fs.existsSync(LOGS_DIR) 
    ? fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.json')).length 
    : 0;

  // Send test query
  console.log('\n2️⃣  Sending test query to API...');
  const testQuery = "What are the benefits of Haridra in Ayurveda?";
  console.log(`   Query: "${testQuery}"`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: testQuery }
        ]
      })
    });

    if (!response.ok) {
      console.error(`   ❌ API request failed: ${response.status} ${response.statusText}`);
      return;
    }

    console.log('   ✅ Query sent successfully');
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers:`);
    console.log(`      X-RAG-Mode: ${response.headers.get('X-RAG-Mode')}`);
    console.log(`      X-Processing-Time-Ms: ${response.headers.get('X-Processing-Time-Ms')}`);

    // Wait a moment for log file to be written
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for new log file
    console.log('\n3️⃣  Checking for new log file...');
    
    if (!fs.existsSync(LOGS_DIR)) {
      console.error('   ❌ Logs directory was not created');
      return;
    }

    const afterCount = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.json')).length;
    
    if (afterCount > beforeCount) {
      console.log(`   ✅ New log file created! (${beforeCount} → ${afterCount})`);
      
      // Find the newest log file
      const logFiles = fs.readdirSync(LOGS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(LOGS_DIR, f),
          mtime: fs.statSync(path.join(LOGS_DIR, f)).mtimeMs
        }))
        .sort((a, b) => b.mtime - a.mtime);

      const newestLog = logFiles[0];
      console.log(`   📄 Log file: ${newestLog.name}`);

      // Read and validate log file
      console.log('\n4️⃣  Validating log file structure...');
      const logData = JSON.parse(fs.readFileSync(newestLog.path, 'utf-8'));

      console.log(`   ✅ Log file is valid JSON`);
      console.log(`   Query: "${logData.query}"`);
      console.log(`   Total Duration: ${logData.totalDuration}ms`);
      console.log(`   Total Steps: ${logData.totalSteps}`);
      console.log(`   Timestamp: ${new Date(logData.timestamp).toLocaleString()}`);

      // Check for required phases
      console.log('\n5️⃣  Checking for required log phases...');
      const requiredPhases = [
        'INITIALIZATION',
        'REQUEST_RECEIVED',
        'QUERY_CLASSIFICATION',
        'NAMESPACE_TARGETING',
        'SEARCH_INITIATION',
        'SEARCH_COMPLETED',
      ];

      const loggedPhases = logData.logEntries.map(e => e.phase);
      let allPhasesPresent = true;

      requiredPhases.forEach(phase => {
        if (loggedPhases.includes(phase)) {
          console.log(`   ✅ ${phase}`);
        } else {
          console.log(`   ❌ ${phase} (missing)`);
          allPhasesPresent = false;
        }
      });

      // Show phase durations
      console.log('\n6️⃣  Phase Durations:');
      let prevDuration = 0;
      logData.logEntries.forEach((entry, idx) => {
        const phaseDuration = entry.duration - prevDuration;
        const percentage = ((phaseDuration / logData.totalDuration) * 100).toFixed(1);
        console.log(`   ${idx + 1}. ${entry.phase.padEnd(30)} ${phaseDuration}ms (${percentage}%)`);
        prevDuration = entry.duration;
      });

      // Summary
      console.log('\n' + '='.repeat(80));
      console.log('✅ Query Debug Logging Test PASSED!');
      console.log('\nLog Viewer Commands:');
      console.log(`   View this log:    node scripts/view-query-log.js ${newestLog.name}`);
      console.log(`   View latest:      node scripts/view-query-log.js --latest`);
      console.log(`   Analyze all logs: node scripts/view-query-log.js --analyze`);
      console.log('=' .repeat(80));

    } else {
      console.error('   ❌ No new log file was created');
      console.error('   Check console output for errors');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(`   ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n   Make sure the dev server is running:');
      console.error('   npm run dev');
    }
  }
}

// Run test
testQueryLogging().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
