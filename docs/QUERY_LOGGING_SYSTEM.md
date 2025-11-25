# Query Logging System Documentation

## Overview

The hybrid RAG query logging system captures **complete, step-by-step execution details** for every query processed through the `/api/embedpinecone` endpoint. This enables comprehensive debugging, performance analysis, and continuous improvement of the RAG pipeline.

## Key Features

✅ **Comprehensive Step Tracking** - Logs every stage: vector search, BM25 analysis, hybrid reranking, document filtering, and LLM generation  
✅ **Minimal Console Output** - Only progress indicators shown in console, full details in log files  
✅ **Structured JSON Logs** - Machine-readable format for analysis and monitoring  
✅ **Error Tracking** - Captures failures with context for debugging  
✅ **Performance Metrics** - Timing data for each step and total processing time  

## Log File Structure

### Location
```
logs/hybrid-rag-queries/YYYY-MM-DD_HH-MM-SS_xxxxx_query.json
```

### Format
```json
{
  "timestamp": "2025-11-21T15:30:45.123Z",
  "query": "What herbs help with anxiety?",
  "sessionId": "2025-11-21_15-30-45_a3f9c",
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "Vector Search (Pinecone)",
      "timestamp": "2025-11-21T15:30:45.200Z",
      "duration": 77,
      "details": {
        "namespacesSearched": ["", "skin-diseases", "mental-disorders"],
        "totalMatchesFound": 25,
        "topResults": [...]
      }
    },
    {
      "stepNumber": 2,
      "stepName": "BM25 Keyword Analysis",
      "timestamp": "2025-11-21T15:30:45.350Z",
      "duration": 150,
      "details": {
        "queryTerms": ["herbs", "help", "anxiety"],
        "documentCount": 10,
        "idfScoresCalculated": {
          "herbs": 2.34,
          "anxiety": 4.12,
          "help": 0.87
        },
        "bm25Parameters": {
          "k1": 1.5,
          "b": 0.75
        }
      }
    },
    {
      "stepNumber": 3,
      "stepName": "Hybrid Reranking (Vector + BM25)",
      "timestamp": "2025-11-21T15:30:45.500Z",
      "duration": 150,
      "details": {
        "vectorWeight": "70%",
        "keywordWeight": "30%",
        "resultsCount": 10,
        "topRerankedResults": [...]
      }
    },
    {
      "stepNumber": 4,
      "stepName": "Document Filtering",
      "timestamp": "2025-11-21T15:30:45.650Z",
      "duration": 150,
      "details": {
        "relevanceThreshold": 0.35,
        "totalDocumentsFiltered": 8,
        "searchMethod": "Hybrid (Vector + BM25)",
        "selectedDocuments": [...]
      }
    },
    {
      "stepNumber": 5,
      "stepName": "LLM Response Generation",
      "timestamp": "2025-11-21T15:30:45.800Z",
      "duration": 150,
      "details": {
        "model": "gpt-4o-mini",
        "temperature": 0.3,
        "contextDocumentsProvided": 8,
        "streamingEnabled": true,
        "promptType": "Ayurvedic RAG with Citations"
      }
    }
  ],
  "results": {
    "documentsRetrieved": 8,
    "namespacesCovered": [
      "Ayurveda Guidelines for Mental Health",
      "Ayurvedic Pharmacopoeia Volume 1"
    ],
    "hybridSearchUsed": true,
    "totalProcessingTime": 677
  }
}
```

## Console Output (Minimal)

The console now shows **only progress indicators**:

```
⏳ Query: "What herbs help with anxiety?"
⏳ Searching vector database...
⏳ Applying hybrid reranking...
⏳ Generating response...
✅ Query processed (8 docs, 2 sources)
```

**What's NOT in console anymore:**
- ❌ Full document content previews
- ❌ Detailed score breakdowns
- ❌ Line-by-line BM25 calculations
- ❌ Verbose initialization messages
- ❌ Per-namespace search results

**All this detail is captured in the log files instead.**

## Logged Data Points

### 1. Vector Search
- Namespaces searched
- Total matches found across all namespaces
- Top 5 results with scores, namespace tags, and content previews

### 2. BM25 Keyword Analysis
- Extracted query terms
- IDF scores for each term (shows which terms are rare/important)
- BM25 parameters (k1, b values)
- Document count analyzed

### 3. Hybrid Reranking
- Vector/keyword weight distribution (default: 70%/30%)
- Original vector scores vs. final hybrid scores
- Top reranked results with score comparisons

### 4. Document Filtering
- Relevance threshold applied
- Number of documents passing threshold
- Search method used (Hybrid vs. Vector Only)
- Final selected documents with metadata

### 5. LLM Generation
- Model name and temperature
- Number of context documents provided
- Prompt type
- Streaming configuration

### 6. Results Summary
- Total documents retrieved
- Source namespaces/documents covered
- Whether hybrid search was used
- Total processing time (milliseconds)

## Usage Examples

### Analyzing Query Performance

```bash
# Find slow queries
grep -r '"totalProcessingTime"' logs/hybrid-rag-queries/ | \
  awk -F': ' '{print $NF}' | \
  sort -n | tail -10

# Check which queries used hybrid search
grep -l '"hybridSearchUsed": true' logs/hybrid-rag-queries/*.json

# Find queries with low document retrieval
jq '.results.documentsRetrieved' logs/hybrid-rag-queries/*.json | \
  sort -n | head -10
```

### Debugging Hybrid Reranking

```bash
# Compare vector vs. hybrid scores for a specific query
jq '.steps[] | select(.stepName == "Hybrid Reranking (Vector + BM25)")' \
  logs/hybrid-rag-queries/2025-11-21_15-30-45_a3f9c_query.json
```

### Tracking IDF Impact

```bash
# See IDF scores for different queries
jq '.steps[] | select(.stepName == "BM25 Keyword Analysis") | .details.idfScoresCalculated' \
  logs/hybrid-rag-queries/*.json
```

## Error Logging

When errors occur, they're captured with full context:

```json
{
  "timestamp": "2025-11-21T15:30:45.123Z",
  "query": "Invalid query...",
  "sessionId": "2025-11-21_15-30-45_x7e2a",
  "steps": [...],
  "results": {
    "documentsRetrieved": 0,
    "namespacesCovered": [],
    "hybridSearchUsed": false,
    "totalProcessingTime": 123
  },
  "error": "Failed to embed query: Rate limit exceeded"
}
```

## Implementation Details

### Core Components

1. **`QueryLogger` class** (`src/lib/query-logger.ts`)
   - Handles log entry creation and step tracking
   - Provides minimal console output methods
   - Writes structured JSON logs to disk

2. **Integration in route** (`src/app/api/embedpinecone/route.ts`)
   - Logger initialized at query start
   - Each pipeline step calls appropriate log method
   - Log saved before streaming response
   - Errors automatically captured

### Adding New Log Steps

To log a new processing step:

```typescript
logger.logStep('Custom Step Name', {
  detail1: value1,
  detail2: value2,
  results: [...],
}, 'optional output string');
```

## Benefits for Continuous Improvement

### 1. Performance Optimization
- Identify slow steps in the pipeline
- Compare processing times across queries
- Track impact of configuration changes

### 2. Quality Assurance
- Verify BM25 IDF calculations are working
- Check hybrid reranking logic
- Ensure correct namespace targeting

### 3. Debugging
- Trace exact path of query through system
- See which documents were retrieved and why
- Understand LLM context provided

### 4. Analytics
- Query pattern analysis
- Document retrieval success rates
- Namespace usage statistics

## Configuration

### Adjust Logging Verbosity

In `src/lib/query-logger.ts`, modify `topResults` limit:

```typescript
topResults: topMatches.slice(0, 5)  // Change 5 to log more/fewer results
```

### Change Log Directory

Update `PINECONE_CONFIG` in route or set environment variable:

```bash
export RAG_LOG_DIR="/custom/path/logs"
```

## Troubleshooting

### Logs Not Being Created

1. **Check directory permissions**
   ```bash
   ls -la logs/hybrid-rag-queries/
   ```

2. **Verify logger initialization**
   - Look for `⏳ Query: "..."` in console
   - If missing, logger may not be instantiated

3. **Check for early errors**
   - Query logs only saved after successful processing
   - Check error logs for initialization failures

### Incomplete Log Files

- **Premature termination**: Process may have crashed before `saveLog()`
- **Disk space**: Ensure adequate space for JSON files
- **Async issues**: All logging is synchronous to prevent race conditions

## Best Practices

1. **Review logs regularly** - Set up periodic analysis of query patterns
2. **Monitor error rates** - Track queries with errors for improvements
3. **Compare configurations** - A/B test different hybrid weights using logs
4. **Archive old logs** - Rotate logs monthly to manage disk usage
5. **Analyze slow queries** - Optimize retrieval for common slow patterns

## Future Enhancements

Potential improvements to the logging system:

- [ ] Log aggregation dashboard
- [ ] Real-time query monitoring
- [ ] Automated performance alerts
- [ ] Log retention policies
- [ ] Integration with observability platforms
- [ ] Query replay for testing
- [ ] A/B test result tracking
