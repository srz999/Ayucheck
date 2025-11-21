# Hybrid RAG Query Logging System - Implementation Summary

## 🎯 Problem Statement

The hybrid RAG system was logging too much information to the console, making it difficult to:
- Track query processing progress
- Debug issues after they occur
- Analyze system performance
- Understand why certain documents were retrieved

**Issues with old system:**
- ❌ Console cluttered with verbose logs
- ❌ No persistent record of query execution
- ❌ Difficult to debug past queries
- ❌ No structured data for analysis

## ✅ Solution Implemented

Created a comprehensive query logging system that:

1. **Captures complete execution details** for every query in structured JSON files
2. **Minimizes console output** to essential progress indicators only
3. **Enables post-mortem debugging** with full context of what happened
4. **Facilitates continuous improvement** through detailed analytics

## 📁 Files Created/Modified

### New Files

1. **`src/lib/query-logger.ts`** (194 lines)
   - Core `QueryLogger` class for structured logging
   - Methods for logging each pipeline step
   - Minimal console progress indicators
   - Automatic log file creation and management

2. **`docs/QUERY_LOGGING_SYSTEM.md`** (422 lines)
   - Complete documentation of logging system
   - Log file format and structure
   - Usage examples and analysis techniques
   - Troubleshooting guide

### Modified Files

1. **`src/app/api/embedpinecone/route.ts`**
   - Integrated QueryLogger throughout POST handler
   - Removed verbose console.log statements (~50+ removed)
   - Added structured logging at each pipeline step
   - Minimal progress indicators only

2. **`examples/test-query-logging.js`**
   - Updated to test new logging system
   - Points to correct endpoint (`/api/embedpinecone`)

## 🔍 What Gets Logged

Each query generates a comprehensive JSON log file with:

### 1. Query Metadata
```json
{
  "timestamp": "2025-11-21T15:30:45.123Z",
  "query": "What herbs help with anxiety?",
  "sessionId": "2025-11-21_15-30-45_a3f9c"
}
```

### 2. Vector Search Details
- Namespaces searched
- Total matches found
- Top 5 results with scores and content previews
- Namespace distribution

### 3. BM25 Keyword Analysis
- Query terms extracted
- **IDF scores for each term** (shows importance)
- BM25 parameters (k1=1.5, b=0.75)
- Document count analyzed

### 4. Hybrid Reranking Results
- Vector weight vs. keyword weight (default 70%/30%)
- Original vector scores
- Final hybrid scores after reranking
- Top reranked documents

### 5. Document Filtering
- Relevance threshold applied
- Number of documents passing threshold
- Search method used (Hybrid vs Vector Only)
- Final selected documents with metadata

### 6. LLM Generation Metadata
- Model name (gpt-4o-mini)
- Temperature (0.3)
- Number of context documents
- Prompt type

### 7. Results Summary
```json
{
  "results": {
    "documentsRetrieved": 8,
    "namespacesCovered": ["Ayurveda Guidelines for Mental Health"],
    "hybridSearchUsed": true,
    "totalProcessingTime": 677
  }
}
```

### 8. Error Tracking (if applicable)
```json
{
  "error": "Failed to embed query: Rate limit exceeded"
}
```

## 📊 Console Output Comparison

### Before (Verbose)
```
🚀 MODULE LOADED: /api/embedpinecone/route.ts
🔑 PINECONE_API_KEY loaded: pcsk_xxx...
📍 PINECONE_INDEX_NAME: ayurveda-knowledge
🌍 PINECONE_ENVIRONMENT: us-east-1-aws
🔥 POST handler called for /api/embedpinecone
🔄 Received request to /api/embedpinecone
🔍 Processing Ayurvedic query via Pinecone: "What herbs help with anxiety?"
🔍 Searching across 5 namespaces...
📊 Retrieved 25 total documents from 5 namespaces:
   1. [default] Score: 0.8542 - Ashwagandha (Withania somnifera) is a powerful adaptogen...
   2. [mental-disorders] Score: 0.8321 - Traditional Ayurvedic approaches to anxiety...
   [... 23 more lines ...]
🔄 Applying FULL BM25 hybrid reranking (with IDF)...
🔍 Document content for FULL BM25 with IDF (1234 chars): Ashwagandha...
📊 Calculating IDF across 10 documents...
📊 Hybrid reranking results (Vector + FULL BM25 with IDF):
   1. Vector: 0.8542 | BM25 (no IDF): 3.45 | BM25 (with IDF): 8.23 → Hybrid: 0.8821
      Content: Ashwagandha (Withania somnifera) is a powerful adaptogen known for...
   [... 10+ more lines ...]
✅ Streaming Ayurvedic response powered by Pinecone vector search
```

### After (Minimal)
```
⏳ Query: "What herbs help with anxiety?"
⏳ Searching vector database...
⏳ Applying hybrid reranking...
⏳ Generating response...
✅ Query processed (8 docs, 2 sources)
```

**Result:** ~90% reduction in console noise, all details preserved in log files

## 🧪 Testing the System

### Run Test Script
```bash
# Ensure dev server is running
npm run dev

# In another terminal
node examples/test-query-logging.js
```

### Expected Output
```
🧪 Testing Query Logging System

📊 Initial log files: 5
📤 Sending query: "What are the benefits of Ashwagandha for stress management?"

✅ Query processed successfully
📋 Response headers:
   - X-Vector-DB: Pinecone
   - X-Search-Method: Vector + BM25 Hybrid
   - X-Documents-Found: 8

📄 Response length: 1234 characters
   First 150 chars: "Ashwagandha (Withania somnifera) is renowned in Ayurvedic medicine..."

📊 Final log files: 6

✅ SUCCESS: New log file created!

📂 Log file: 2025-11-21_15-30-45_a3f9c_query.json

📊 Log Summary:
   Query: "What are the benefits of Ashwagandha for stress management?"
   Session ID: 2025-11-21_15-30-45_a3f9c
   Total Steps: 5
   Documents Retrieved: 8
   Namespaces: Ayurvedic Pharmacopoeia Volume 1, Ayurveda Guidelines for Mental Health
   Hybrid Search Used: true
   Total Time: 677ms

📋 Processing Steps:
   1. Vector Search (Pinecone) (77ms)
   2. BM25 Keyword Analysis (150ms)
   3. Hybrid Reranking (Vector + BM25) (150ms)
   4. Document Filtering (150ms)
   5. LLM Response Generation (150ms)

✅ Critical Steps Check:
   ✅ Vector Search (Pinecone)
   ✅ BM25 Keyword Analysis
   ✅ Hybrid Reranking (Vector + BM25)
   ✅ Document Filtering
   ✅ LLM Response Generation

📊 BM25 IDF Scores:
   "ashwagandha": 4.23
   "benefits": 1.87
   "stress": 3.45
   "management": 2.91

🎉 Query logging test PASSED!
```

## 📈 Use Cases for Continuous Improvement

### 1. Performance Analysis
```bash
# Find slowest queries
grep -h '"totalProcessingTime"' logs/hybrid-rag-queries/*.json | \
  jq -r '.results.totalProcessingTime' | \
  sort -n | tail -10
```

### 2. BM25 IDF Effectiveness
```bash
# See which terms get high IDF scores (rare/important terms)
jq -r '.steps[] | select(.stepName == "BM25 Keyword Analysis") | .details.idfScoresCalculated' \
  logs/hybrid-rag-queries/*.json | \
  jq -r 'to_entries | .[] | "\(.key): \(.value)"' | \
  sort -t: -k2 -rn | head -20
```

### 3. Hybrid Reranking Impact
```bash
# Compare vector-only vs hybrid scores
jq '.steps[] | select(.stepName == "Hybrid Reranking (Vector + BM25)") | .details.topRerankedResults' \
  logs/hybrid-rag-queries/*.json
```

### 4. Document Retrieval Patterns
```bash
# Which namespaces are most commonly used?
jq -r '.results.namespacesCovered[]' logs/hybrid-rag-queries/*.json | \
  sort | uniq -c | sort -rn
```

### 5. Error Rate Tracking
```bash
# Find all failed queries
jq 'select(.error != null) | {query, error}' logs/hybrid-rag-queries/*.json
```

## 🎓 Key Improvements

### For Developers
- ✅ Clean console output for development
- ✅ Complete debugging information preserved
- ✅ Easy to trace query execution path
- ✅ Performance bottleneck identification

### For System Monitoring
- ✅ Structured JSON logs for parsing
- ✅ Time-series data on query performance
- ✅ Error tracking with full context
- ✅ Resource usage patterns

### For Continuous Improvement
- ✅ A/B testing different configurations
- ✅ Quality metrics on document retrieval
- ✅ BM25 IDF effectiveness validation
- ✅ Hybrid weight optimization data

## 🔧 Configuration Options

### Adjust Log Verbosity

In `src/lib/query-logger.ts`, modify limits:

```typescript
// Show more/fewer top results in logs
topResults: topMatches.slice(0, 5)  // Change 5 to desired count

// Adjust content preview length
this.truncate(content, 100)  // Change 100 to desired length
```

### Change Hybrid Weights

In `src/app/api/embedpinecone/route.ts`:

```typescript
const rerankedResults = HybridSearch.rerank(
  userQuestion, 
  documentsWithScores, 
  0.7  // Change to adjust vector weight (0.5 = 50/50, 0.8 = 80/20)
);
```

### Adjust Relevance Thresholds

```typescript
const relevanceThreshold = 0.35;  // Lower = more permissive, Higher = stricter
```

## 🚀 Next Steps

1. **Test the system**
   ```bash
   npm run dev
   node examples/test-query-logging.js
   ```

2. **Review generated logs**
   ```bash
   cat logs/hybrid-rag-queries/*.json | jq '.'
   ```

3. **Start collecting data**
   - Run queries through the system
   - Let logs accumulate over time
   - Analyze patterns and optimize

4. **Set up monitoring**
   - Create dashboard for log analysis
   - Set up alerts for errors
   - Track performance trends

## 📝 Summary

The new query logging system provides:

- ✅ **Complete transparency** into query processing
- ✅ **Minimal console clutter** (5 lines vs 50+ lines)
- ✅ **Persistent debugging information** in structured JSON
- ✅ **Performance metrics** for optimization
- ✅ **Error tracking** with full context
- ✅ **BM25 IDF validation** data
- ✅ **Hybrid reranking insights** for tuning

All query details are now captured in structured log files at:
```
logs/hybrid-rag-queries/YYYY-MM-DD_HH-MM-SS_xxxxx_query.json
```

Console output reduced to essential progress indicators only! 🎉
