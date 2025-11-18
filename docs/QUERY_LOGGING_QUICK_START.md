# 🎯 Query Debug Logging - Quick Start Guide

## What Was Implemented

Added comprehensive step-by-step debug logging to the **Pinecone Hybrid RAG** endpoint (`/api/pineconehybridrag`) that creates a separate JSON log file for each query.

---

## 📁 Log Files

### Location
```
logs/hybrid-rag-queries/
├── 2025-11-17_143052_what-is-haridra-benefits.json
├── 2025-11-17_143145_eczema-treatment-ayurveda.json
└── 2025-11-17_143230_anxiety-herbal-remedies.json
```

### Filename Format
```
YYYY-MM-DD_HHMMSS_query-title.json
```
- **Date/Time**: Timestamp when query was received
- **Query Title**: Sanitized version of user's question (max 50 chars)

---

## 🚀 Quick Usage

### 1. Send a Query
```bash
# Just use the API normally
curl -X POST http://localhost:3000/api/pineconehybridrag \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is Haridra?"}]}'
```

### 2. View the Log
```bash
# View most recent log
node scripts/view-query-log.js --latest

# List all logs
node scripts/view-query-log.js

# View specific log
node scripts/view-query-log.js 2025-11-17_143052_what-is-haridra.json

# Analyze all logs
node scripts/view-query-log.js --analyze
```

---

## 📊 What Gets Logged

### 12 Phases Tracked

1. **INITIALIZATION** - Logger setup
2. **REQUEST_RECEIVED** - Query + config + system status
3. **QUERY_CLASSIFICATION** - Intents detected + datasets recommended
4. **NAMESPACE_TARGETING** - Pinecone namespace selection (cost savings)
5. **QUERY_EXPANSION** - Original + 2-3 expanded variants
6. **SEARCH_INITIATION** - Vector + keyword search configs
7. **SEARCH_COMPLETED** - Results counts + top scores
8. **HYBRID_SCORING** - Score combination (70% vector + 30% keyword)
9. **RELEVANCE_FILTERING** - Filter low-confidence results
10. **CONTEXT_PREPARATION** - Format top results for LLM
11. **LLM_GENERATION_START** - Model setup + context stats
12. **RESPONSE_STREAMING** - Final timing + headers
13. **ERROR** (if occurs) - Full error details + stack trace

### Example Log Entry
```json
{
  "step": 7,
  "timestamp": "2025-11-17T14:30:53.934Z",
  "phase": "SEARCH_COMPLETED",
  "details": {
    "searchDuration": 1834,
    "vectorResults": {
      "count": 8,
      "topScores": ["0.8734", "0.8521", "0.8312"]
    },
    "keywordResults": {
      "count": 12,
      "topScores": ["0.7845", "0.7623", "0.7401"]
    },
    "totalResultsFound": 20
  },
  "duration": 1884
}
```

---

## 🎨 Log Viewer Output Example

```
📊 Query Log Analysis
================================================================================

📝 Summary:
   Query: What is Haridra?
   Duration: 2847ms
   Steps: 12
   Timestamp: 11/17/2025, 2:30:52 PM

⏱️  Phase Durations:
   1. INITIALIZATION              0ms (0.0%) 
   2. REQUEST_RECEIVED            50ms (1.8%) ██
   3. QUERY_CLASSIFICATION        45ms (1.6%) ██
   4. NAMESPACE_TARGETING         12ms (0.4%) █
   5. QUERY_EXPANSION             12ms (0.4%) █
   6. SEARCH_INITIATION           8ms (0.3%) █
   7. SEARCH_COMPLETED            1834ms (64.4%) ███████████████████
   8. HYBRID_SCORING              23ms (0.8%) █
   9. RELEVANCE_FILTERING         34ms (1.2%) ██
   10. CONTEXT_PREPARATION        15ms (0.5%) █
   11. LLM_GENERATION_START       156ms (5.5%) ███
   12. RESPONSE_STREAMING         658ms (23.1%) ███████

🔧 Configuration:
   Hybrid Scoring: true
   Hybrid Alpha: 0.7
   Pinecone: ✓
   Local Datasets: ✓

🔍 Search Results:
   Vector: 8 results
   Keyword: 12 results
   Total: 20 results

⚖️  Hybrid Scoring:
   Mode: hybrid
   Alpha: 0.7 (70% vector, 30% keyword)
   Output: 15 results (5 hybrid matches)
   Deduplication: 20 → 15

💡 Performance Insights:
   Slowest Phase: SEARCH_COMPLETED (1834ms)
```

---

## 🧪 Testing

### Run Test Suite
```bash
# Make sure dev server is running
npm run dev

# Run logging test
node examples/test-query-logging.js
```

Expected output:
```
🧪 Testing Query Debug Logging System
================================================================================

1️⃣  Checking logs directory...
   ✅ Logs directory exists with 0 existing logs

2️⃣  Sending test query to API...
   Query: "What are the benefits of Haridra in Ayurveda?"
   ✅ Query sent successfully
   Status: 200
   Headers:
      X-RAG-Mode: hybrid
      X-Processing-Time-Ms: 2847

3️⃣  Checking for new log file...
   ✅ New log file created! (0 → 1)
   📄 Log file: 2025-11-17_143052_what-are-the-benefits-of-haridra-in-ayurveda.json

4️⃣  Validating log file structure...
   ✅ Log file is valid JSON
   Query: "What are the benefits of Haridra in Ayurveda?"
   Total Duration: 2847ms
   Total Steps: 12

5️⃣  Checking for required log phases...
   ✅ INITIALIZATION
   ✅ REQUEST_RECEIVED
   ✅ QUERY_CLASSIFICATION
   ✅ NAMESPACE_TARGETING
   ✅ SEARCH_INITIATION
   ✅ SEARCH_COMPLETED

✅ Query Debug Logging Test PASSED!
```

---

## 🎯 Use Cases

### 1. Debug Slow Queries
```bash
# Find queries taking >5s
node scripts/view-query-log.js | grep -A 3 "Duration: [5-9][0-9][0-9][0-9]"

# View the slowest phase
node scripts/view-query-log.js --latest
# Look for "Slowest Phase" in output
```

### 2. Investigate Errors
```bash
# View error details
node scripts/view-query-log.js <log-file-with-error>
# Look for "❌ Error Details" section
```

### 3. Analyze Query Patterns
```bash
# Get statistics across all queries
node scripts/view-query-log.js --analyze

# Shows:
# - Total queries processed
# - Error rate
# - Avg processing time
# - Mode distribution (hybrid/vector-only/local-only)
# - Avg result counts
```

### 4. Optimize Performance
```bash
# View log and identify bottleneck
node scripts/view-query-log.js --latest

# Common bottlenecks:
# - SEARCH_COMPLETED >2s → Pinecone latency or too many namespaces
# - LLM_GENERATION_START >500ms → Context too large
# - QUERY_EXPANSION >100ms → Too many variants
```

---

## 📈 Performance Impact

- **Overhead**: <10ms per query (async file write)
- **Memory**: ~2-5KB per query log
- **Disk Space**: ~5MB per 1000 queries
- **Response Time**: No blocking (log written after streaming starts)

---

## 🔧 Maintenance

### Log Cleanup

Create cleanup script (optional):
```javascript
// scripts/cleanup-logs.js
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs', 'hybrid-rag-queries');
const retentionDays = 7;

const files = fs.readdirSync(logsDir);
const now = Date.now();

files.forEach(file => {
  const filePath = path.join(logsDir, file);
  const stats = fs.statSync(filePath);
  const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
  
  if (ageInDays > retentionDays) {
    fs.unlinkSync(filePath);
    console.log(`Deleted: ${file}`);
  }
});
```

Run manually or via cron:
```bash
# Run cleanup
node scripts/cleanup-logs.js

# Or add to crontab (daily at 2 AM)
0 2 * * * cd /path/to/Ayucheck && node scripts/cleanup-logs.js
```

---

## 📚 Full Documentation

For complete documentation, see:
- **`docs/HYBRID_RAG_DEBUG_LOGGING.md`** - Full guide with all log phases
- **`docs/QUERY_DEBUG_LOGGING_SUMMARY.md`** - Implementation summary

---

## ✅ Checklist

- [x] Logging implemented in pineconehybridrag route
- [x] 12 phases tracked with detailed data
- [x] Per-query log files with meaningful names
- [x] Console output for real-time monitoring
- [x] Log viewer CLI tool created
- [x] Test suite created
- [x] Documentation complete
- [x] .gitignore updated to exclude logs/

---

## 🎉 Summary

You now have **comprehensive debug logging** for every Hybrid RAG query!

**Every query automatically creates a log file** with:
- ✅ Complete execution trace (12 phases)
- ✅ Exact timing for each phase
- ✅ Search results (vector + keyword counts)
- ✅ Hybrid scoring details
- ✅ Configuration used
- ✅ Error context (if any)

**Use the log viewer** to:
- 🔍 Debug issues
- 📊 Analyze performance
- 📈 Optimize configuration
- 🐛 Track errors

---

**Quick Commands**:
```bash
npm run dev                                  # Start server
node examples/test-query-logging.js         # Test logging
node scripts/view-query-log.js --latest     # View latest log
node scripts/view-query-log.js --analyze    # Statistics
```

🚀 **Start using it now** - logs are created automatically for every query!
