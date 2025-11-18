#!/usr/bin/env node

/**
 * Hybrid RAG Query Log Viewer
 * 
 * View and analyze debug logs from the Pinecone Hybrid RAG endpoint
 * 
 * Usage:
 *   node scripts/view-query-log.js                    # List recent logs
 *   node scripts/view-query-log.js <filename>         # View specific log
 *   node scripts/view-query-log.js --latest           # View most recent log
 *   node scripts/view-query-log.js --analyze          # Analyze all logs
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs', 'hybrid-rag-queries');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function listLogs() {
  if (!fs.existsSync(LOGS_DIR)) {
    console.log(colorize('❌ No logs directory found', 'red'));
    console.log(colorize(`   Expected: ${LOGS_DIR}`, 'dim'));
    return [];
  }

  const files = fs.readdirSync(LOGS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first

  if (files.length === 0) {
    console.log(colorize('ℹ️  No query logs found', 'yellow'));
    return [];
  }

  console.log(colorize('\n📁 Recent Query Logs:', 'cyan'));
  console.log(colorize('='.repeat(80), 'dim'));

  files.slice(0, 10).forEach((file, idx) => {
    const filePath = path.join(LOGS_DIR, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(1);
    const age = getTimeAgo(stats.mtimeMs);

    console.log(`${colorize(`${idx + 1}.`, 'bright')} ${file}`);
    console.log(colorize(`   Size: ${size}KB  |  ${age}`, 'dim'));
  });

  console.log(colorize('='.repeat(80), 'dim'));
  console.log(colorize(`\nTotal: ${files.length} logs`, 'dim'));

  return files;
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

function viewLog(filename) {
  const filePath = path.join(LOGS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(colorize(`❌ Log file not found: ${filename}`, 'red'));
    return;
  }

  const log = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log(colorize('\n📊 Query Log Analysis', 'cyan'));
  console.log(colorize('='.repeat(80), 'dim'));

  // Summary
  console.log(colorize('\n📝 Summary:', 'bright'));
  console.log(`   Query: ${colorize(log.query, 'green')}`);
  console.log(`   Duration: ${colorize(log.totalDuration + 'ms', 'yellow')}`);
  console.log(`   Steps: ${log.totalSteps}`);
  console.log(`   Timestamp: ${new Date(log.timestamp).toLocaleString()}`);

  // Phase breakdown
  console.log(colorize('\n⏱️  Phase Durations:', 'bright'));
  
  const phaseDurations = [];
  let prevDuration = 0;

  log.logEntries.forEach((entry, idx) => {
    const phaseDuration = entry.duration - prevDuration;
    phaseDurations.push({ phase: entry.phase, duration: phaseDuration });
    prevDuration = entry.duration;

    const percentage = ((phaseDuration / log.totalDuration) * 100).toFixed(1);
    const bar = '█'.repeat(Math.ceil(phaseDuration / 100));
    
    console.log(`   ${colorize(entry.step + '.', 'dim')} ${entry.phase.padEnd(30)} ${colorize(phaseDuration + 'ms', 'yellow')} ${colorize('(' + percentage + '%)', 'dim')} ${colorize(bar, 'blue')}`);
  });

  // Key details
  const requestEntry = log.logEntries.find(e => e.phase === 'REQUEST_RECEIVED');
  const classificationEntry = log.logEntries.find(e => e.phase === 'QUERY_CLASSIFICATION');
  const searchEntry = log.logEntries.find(e => e.phase === 'SEARCH_COMPLETED');
  const hybridEntry = log.logEntries.find(e => e.phase === 'HYBRID_SCORING');
  const errorEntry = log.logEntries.find(e => e.phase === 'ERROR');

  if (requestEntry) {
    console.log(colorize('\n🔧 Configuration:', 'bright'));
    console.log(`   Hybrid Scoring: ${requestEntry.details.configuration.useHybridScoring}`);
    console.log(`   Hybrid Alpha: ${requestEntry.details.configuration.hybridAlpha}`);
    console.log(`   Query Expansion: ${requestEntry.details.configuration.enableQueryExpansion}`);
    console.log(`   Pinecone: ${colorize(requestEntry.details.availability.pinecone ? '✓' : '✗', requestEntry.details.availability.pinecone ? 'green' : 'red')}`);
    console.log(`   Local Datasets: ${colorize(requestEntry.details.availability.localDatasets ? '✓' : '✗', requestEntry.details.availability.localDatasets ? 'green' : 'red')}`);
  }

  if (classificationEntry) {
    console.log(colorize('\n🎯 Query Classification:', 'bright'));
    console.log(`   Intents: ${classificationEntry.details.intents.join(', ')}`);
    console.log(`   Datasets: ${classificationEntry.details.recommendedDatasets.join(', ')}`);
  }

  if (searchEntry) {
    console.log(colorize('\n🔍 Search Results:', 'bright'));
    console.log(`   Vector: ${searchEntry.details.vectorResults.count} results`);
    console.log(`   Keyword: ${searchEntry.details.keywordResults.count} results`);
    console.log(`   Total: ${searchEntry.details.totalResultsFound} results`);
    
    if (searchEntry.details.vectorResults.count > 0) {
      console.log(`   Top Vector Scores: ${searchEntry.details.vectorResults.topScores.join(', ')}`);
    }
    if (searchEntry.details.keywordResults.count > 0) {
      console.log(`   Top Keyword Scores: ${searchEntry.details.keywordResults.topScores.join(', ')}`);
    }
  }

  if (hybridEntry) {
    console.log(colorize('\n⚖️  Hybrid Scoring:', 'bright'));
    console.log(`   Mode: ${colorize(hybridEntry.details.mode, 'magenta')}`);
    console.log(`   Alpha: ${hybridEntry.details.hybridAlpha} (${hybridEntry.details.vectorWeight} vector, ${hybridEntry.details.keywordWeight} keyword)`);
    console.log(`   Input: ${hybridEntry.details.inputResults.vector} vector + ${hybridEntry.details.inputResults.keyword} keyword`);
    console.log(`   Output: ${hybridEntry.details.outputResults} results (${hybridEntry.details.hybridMatches} hybrid matches)`);
    console.log(`   Deduplication: ${hybridEntry.details.deduplication}`);
  }

  if (errorEntry) {
    console.log(colorize('\n❌ Error Details:', 'red'));
    console.log(`   Type: ${errorEntry.details.errorType}`);
    console.log(`   Message: ${errorEntry.details.errorMessage}`);
    console.log(`   Mode at Failure: ${errorEntry.details.ragMode}`);
    if (errorEntry.details.errorStack) {
      console.log(colorize('\n   Stack Trace:', 'dim'));
      console.log(colorize(errorEntry.details.errorStack.split('\n').slice(0, 5).join('\n'), 'dim'));
    }
  }

  // Performance insights
  const slowestPhase = phaseDurations.reduce((max, phase) => 
    phase.duration > max.duration ? phase : max
  , { phase: '', duration: 0 });

  console.log(colorize('\n💡 Performance Insights:', 'bright'));
  console.log(`   Slowest Phase: ${colorize(slowestPhase.phase, 'red')} (${slowestPhase.duration}ms)`);
  
  if (slowestPhase.phase === 'SEARCH_COMPLETED' && slowestPhase.duration > 2000) {
    console.log(colorize('   ⚠️  Search is taking longer than expected (>2s)', 'yellow'));
  }
  if (log.totalDuration > 5000) {
    console.log(colorize('   ⚠️  Total processing time is high (>5s)', 'yellow'));
  }

  console.log(colorize('\n' + '='.repeat(80), 'dim'));
}

function analyzeAllLogs() {
  if (!fs.existsSync(LOGS_DIR)) {
    console.log(colorize('❌ No logs directory found', 'red'));
    return;
  }

  const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log(colorize('ℹ️  No query logs found', 'yellow'));
    return;
  }

  console.log(colorize('\n📊 Analyzing All Query Logs...', 'cyan'));
  console.log(colorize('='.repeat(80), 'dim'));

  const stats = {
    totalQueries: files.length,
    totalDuration: 0,
    modes: { hybrid: 0, vectorOnly: 0, localOnly: 0 },
    errors: 0,
    avgVectorResults: 0,
    avgKeywordResults: 0,
    avgProcessingTime: 0,
  };

  files.forEach(file => {
    try {
      const log = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, file), 'utf-8'));
      stats.totalDuration += log.totalDuration;

      const hybridEntry = log.logEntries.find(e => e.phase === 'HYBRID_SCORING' || e.phase === 'MODE_SELECTION');
      if (hybridEntry) {
        const mode = hybridEntry.details.mode;
        if (mode === 'hybrid') stats.modes.hybrid++;
        else if (mode === 'vector-only') stats.modes.vectorOnly++;
        else if (mode === 'local-only') stats.modes.localOnly++;
      }

      const searchEntry = log.logEntries.find(e => e.phase === 'SEARCH_COMPLETED');
      if (searchEntry) {
        stats.avgVectorResults += searchEntry.details.vectorResults.count;
        stats.avgKeywordResults += searchEntry.details.keywordResults.count;
      }

      if (log.logEntries.some(e => e.phase === 'ERROR')) {
        stats.errors++;
      }
    } catch (err) {
      console.error(colorize(`Error reading ${file}: ${err.message}`, 'red'));
    }
  });

  stats.avgProcessingTime = stats.totalDuration / stats.totalQueries;
  stats.avgVectorResults /= stats.totalQueries;
  stats.avgKeywordResults /= stats.totalQueries;

  console.log(colorize('\n📈 Overall Statistics:', 'bright'));
  console.log(`   Total Queries: ${stats.totalQueries}`);
  console.log(`   Errors: ${colorize(stats.errors.toString(), stats.errors > 0 ? 'red' : 'green')} (${((stats.errors / stats.totalQueries) * 100).toFixed(1)}%)`);
  console.log(`   Avg Processing Time: ${colorize(stats.avgProcessingTime.toFixed(0) + 'ms', 'yellow')}`);

  console.log(colorize('\n⚖️  RAG Modes:', 'bright'));
  console.log(`   Hybrid: ${stats.modes.hybrid} (${((stats.modes.hybrid / stats.totalQueries) * 100).toFixed(1)}%)`);
  console.log(`   Vector-Only: ${stats.modes.vectorOnly} (${((stats.modes.vectorOnly / stats.totalQueries) * 100).toFixed(1)}%)`);
  console.log(`   Local-Only: ${stats.modes.localOnly} (${((stats.modes.localOnly / stats.totalQueries) * 100).toFixed(1)}%)`);

  console.log(colorize('\n🔍 Search Results:', 'bright'));
  console.log(`   Avg Vector Results: ${stats.avgVectorResults.toFixed(1)}`);
  console.log(`   Avg Keyword Results: ${stats.avgKeywordResults.toFixed(1)}`);

  console.log(colorize('\n' + '='.repeat(80), 'dim'));
}

// Main CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  listLogs();
} else if (args[0] === '--latest') {
  const files = listLogs();
  if (files.length > 0) {
    viewLog(files[0]);
  }
} else if (args[0] === '--analyze') {
  analyzeAllLogs();
} else if (args[0] === '--help' || args[0] === '-h') {
  console.log(colorize('\n🔍 Hybrid RAG Query Log Viewer', 'cyan'));
  console.log(colorize('='.repeat(80), 'dim'));
  console.log('\nUsage:');
  console.log('  node scripts/view-query-log.js                    List recent logs');
  console.log('  node scripts/view-query-log.js <filename>         View specific log');
  console.log('  node scripts/view-query-log.js --latest           View most recent log');
  console.log('  node scripts/view-query-log.js --analyze          Analyze all logs');
  console.log('  node scripts/view-query-log.js --help             Show this help');
  console.log('');
} else {
  viewLog(args[0]);
}
