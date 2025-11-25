/**
 * View Human-Friendly Query Logs
 * 
 * This script displays logs in a beautiful, readable format.
 * Usage:
 *   node view-human-friendly-log.js             # Show latest query log
 *   node view-human-friendly-log.js --init      # Show initialization log
 *   node view-human-friendly-log.js --all       # Show all logs
 *   node view-human-friendly-log.js <filename>  # Show specific log
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(process.cwd(), 'logs', 'hybrid-rag-queries');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

function formatTime(seconds) {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`;
  }
  return `${seconds.toFixed(2)}s`;
}

function printSeparator(char = '─', length = 80) {
  console.log(colors.dim + char.repeat(length) + colors.reset);
}

function printHeader(text) {
  console.log('\n' + colors.bright + colors.cyan + text + colors.reset);
  printSeparator('═');
}

function printSubHeader(text) {
  console.log('\n' + colors.bright + colors.yellow + text + colors.reset);
  printSeparator();
}

function displayQueryLog(logData) {
  const { summary, narrative, technicalLog } = logData;
  
  // Display Summary
  printHeader('📊 QUERY SUMMARY');
  console.log(colors.bright + 'Query:' + colors.reset, summary.query);
  console.log(colors.bright + 'Outcome:' + colors.reset, 
    summary.outcome === 'SUCCESS' 
      ? colors.green + '✓ ' + summary.outcome + colors.reset 
      : colors.red + '✗ ' + summary.outcome + colors.reset
  );
  console.log(colors.bright + 'Total Time:' + colors.reset, 
    colors.yellow + formatTime(summary.totalDurationSeconds) + colors.reset);
  console.log(colors.bright + 'Steps:' + colors.reset, summary.totalSteps);
  console.log(colors.bright + 'Timestamp:' + colors.reset, 
    colors.dim + new Date(summary.timestamp).toLocaleString() + colors.reset);
  
  // Display Narrative
  printSubHeader('📖 WHAT HAPPENED (Step-by-Step)');
  for (const entry of narrative) {
    const stepNum = colors.cyan + `[${entry.step}]` + colors.reset;
    const time = colors.dim + `(${entry.time})` + colors.reset;
    const phase = colors.magenta + entry.phase + colors.reset;
    
    console.log(`\n${stepNum} ${phase} ${time}`);
    console.log('  ' + entry.what_happened);
  }
  
  // Display Technical Summary
  printSubHeader('🔧 TECHNICAL SUMMARY');
  console.log(colors.bright + 'Total Steps Logged:' + colors.reset, technicalLog.length);
  
  const phases = technicalLog.map(e => e.phase);
  const uniquePhases = [...new Set(phases)];
  console.log(colors.bright + 'Phases:' + colors.reset, uniquePhases.join(', '));
  
  const avgTime = technicalLog.reduce((sum, e) => sum + e.elapsedSeconds, 0) / technicalLog.length;
  console.log(colors.bright + 'Average Step Time:' + colors.reset, formatTime(avgTime));
  
  const slowestStep = technicalLog.reduce((max, e) => 
    e.elapsedSeconds > max.elapsedSeconds ? e : max
  );
  console.log(colors.bright + 'Slowest Step:' + colors.reset, 
    `${slowestStep.phase} (${formatTime(slowestStep.elapsedSeconds)})`);
  
  printSeparator('═');
  console.log('');
}

function displayInitLog(logData) {
  const { summary, narrative, technicalDetails } = logData;
  
  // Display Summary
  printHeader('🚀 SYSTEM INITIALIZATION');
  console.log(colors.bright + 'Event:' + colors.reset, summary.event);
  console.log(colors.bright + 'Status:' + colors.reset, 
    summary.status === 'READY' 
      ? colors.green + '✓ ' + summary.status + colors.reset 
      : colors.yellow + '⚠ ' + summary.status + colors.reset
  );
  console.log(colors.bright + 'Timestamp:' + colors.reset, 
    colors.dim + new Date(summary.timestamp).toLocaleString() + colors.reset);
  
  // Display Narrative
  printSubHeader('📖 INITIALIZATION STEPS');
  for (const entry of narrative) {
    const stepNum = colors.cyan + `[${entry.step}]` + colors.reset;
    console.log(`\n${stepNum}`);
    console.log('  ' + entry.what_happened);
  }
  
  // Display Configuration
  printSubHeader('⚙️ CONFIGURATION');
  const config = technicalDetails.configuration;
  console.log(colors.bright + 'Hybrid Alpha:' + colors.reset, 
    `${(config.hybridAlpha * 100).toFixed(0)}% semantic, ${((1 - config.hybridAlpha) * 100).toFixed(0)}% keyword`);
  console.log(colors.bright + 'Top K:' + colors.reset, config.topK);
  console.log(colors.bright + 'Query Expansion:' + colors.reset, 
    config.queryExpansionEnabled ? colors.green + 'Enabled' + colors.reset : 'Disabled');
  console.log(colors.bright + 'Query Classification:' + colors.reset, 
    config.queryClassificationEnabled ? colors.green + 'Enabled' + colors.reset : 'Disabled');
  console.log(colors.bright + 'Namespace Targeting:' + colors.reset, 
    config.namespaceTargetingEnabled ? colors.green + 'Enabled' + colors.reset : 'Disabled');
  
  // Display Pinecone Status
  printSubHeader('🗄️ VECTOR DATABASE');
  const pinecone = technicalDetails.pinecone;
  console.log(colors.bright + 'Pinecone:' + colors.reset, 
    pinecone.available ? colors.green + 'Connected' + colors.reset : colors.red + 'Unavailable' + colors.reset);
  if (pinecone.available) {
    console.log(colors.bright + 'Index:' + colors.reset, pinecone.indexName);
    console.log(colors.bright + 'Environment:' + colors.reset, pinecone.environment);
    console.log(colors.bright + 'Embedding Model:' + colors.reset, pinecone.embeddingModel);
  }
  
  // Display Local Datasets
  printSubHeader('📚 LOCAL KNOWLEDGE BASES');
  const datasets = technicalDetails.localDatasets;
  console.log(colors.bright + 'Count:' + colors.reset, datasets.count);
  if (datasets.names && datasets.names.length > 0) {
    datasets.names.forEach((name, index) => {
      console.log(`  ${colors.cyan}${index + 1}.${colors.reset} ${name}`);
    });
  }
  
  printSeparator('═');
  console.log('');
}

function getLogFiles() {
  if (!fs.existsSync(LOGS_DIR)) {
    console.error(colors.red + 'Error: Logs directory not found:' + colors.reset, LOGS_DIR);
    return [];
  }
  
  const files = fs.readdirSync(LOGS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(LOGS_DIR, f),
      isInit: f.includes('_init.json'),
      stats: fs.statSync(path.join(LOGS_DIR, f))
    }))
    .sort((a, b) => b.stats.mtime - a.stats.mtime);
  
  return files;
}

function main() {
  const args = process.argv.slice(2);
  const files = getLogFiles();
  
  if (files.length === 0) {
    console.log(colors.yellow + 'No log files found in:' + colors.reset, LOGS_DIR);
    console.log('\nMake sure to:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Open the Hybrid RAG chat interface');
    console.log('3. Make a test query');
    return;
  }
  
  // Handle --init flag
  if (args.includes('--init')) {
    const initFiles = files.filter(f => f.isInit);
    if (initFiles.length === 0) {
      console.log(colors.yellow + 'No initialization logs found.' + colors.reset);
      return;
    }
    
    console.log(colors.bright + `\nFound ${initFiles.length} initialization log(s):\n` + colors.reset);
    const latest = initFiles[0];
    console.log(colors.dim + `Viewing: ${latest.name}` + colors.reset);
    console.log(colors.dim + `Created: ${latest.stats.mtime.toLocaleString()}` + colors.reset);
    
    const logData = JSON.parse(fs.readFileSync(latest.path, 'utf-8'));
    displayInitLog(logData);
    return;
  }
  
  // Handle --all flag
  if (args.includes('--all')) {
    console.log(colors.bright + `\nAll logs (${files.length} total):\n` + colors.reset);
    files.forEach((file, index) => {
      const icon = file.isInit ? '🚀' : '💬';
      const time = colors.dim + file.stats.mtime.toLocaleString() + colors.reset;
      console.log(`${icon} ${colors.cyan}${index + 1}.${colors.reset} ${file.name}`);
      console.log(`   ${time}`);
    });
    console.log('\nUse: node view-human-friendly-log.js <filename> to view a specific log');
    return;
  }
  
  // Handle specific file
  if (args.length > 0) {
    const filename = args[0];
    const file = files.find(f => f.name === filename || f.path === filename);
    
    if (!file) {
      console.error(colors.red + 'Error: Log file not found:' + colors.reset, filename);
      console.log('\nAvailable files:');
      files.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}`));
      return;
    }
    
    console.log(colors.dim + `\nViewing: ${file.name}` + colors.reset);
    console.log(colors.dim + `Created: ${file.stats.mtime.toLocaleString()}` + colors.reset);
    
    const logData = JSON.parse(fs.readFileSync(file.path, 'utf-8'));
    if (file.isInit) {
      displayInitLog(logData);
    } else {
      displayQueryLog(logData);
    }
    return;
  }
  
  // Default: Show latest query log
  const queryFiles = files.filter(f => !f.isInit);
  if (queryFiles.length === 0) {
    console.log(colors.yellow + 'No query logs found. Showing initialization log instead.' + colors.reset);
    const initFiles = files.filter(f => f.isInit);
    if (initFiles.length > 0) {
      const latest = initFiles[0];
      console.log(colors.dim + `\nViewing: ${latest.name}` + colors.reset);
      const logData = JSON.parse(fs.readFileSync(latest.path, 'utf-8'));
      displayInitLog(logData);
    }
    return;
  }
  
  const latest = queryFiles[0];
  console.log(colors.dim + `\nViewing latest query log: ${latest.name}` + colors.reset);
  console.log(colors.dim + `Created: ${latest.stats.mtime.toLocaleString()}` + colors.reset);
  
  const logData = JSON.parse(fs.readFileSync(latest.path, 'utf-8'));
  displayQueryLog(logData);
  
  console.log(colors.dim + '\nTip: Use --init to see initialization log, --all to list all logs' + colors.reset);
}

main();
