# Human-Friendly Query Logging

## Overview

The Hybrid RAG system now generates **human-readable logs** that explain what happened during each query in plain English. These logs are designed for non-technical review, making it easy to understand the system's decision-making process.

## Log File Format

### Location
All logs are saved in: `logs/hybrid-rag-queries/`

### File Naming
- **Query logs**: `YYYY-MM-DD_HHMMSS_query-title.json`
- **Initialization log**: `YYYY-MM-DD_HHMMSS_init.json`

### Log Structure

```json
{
  "summary": {
    "query": "What are the benefits of Ashwagandha?",
    "queryTitle": "what-are-the-benefits-of-ashwagandha",
    "totalSteps": 12,
    "totalDurationSeconds": 3.45,
    "timestamp": "2024-01-15T10:30:45.123Z",
    "outcome": "SUCCESS"
  },
  
  "narrative": [
    {
      "step": 1,
      "time": "0.00s",
      "phase": "INITIALIZATION",
      "what_happened": "🚀 Started processing your question: \"What are the benefits of Ashwagandha?\""
    },
    {
      "step": 2,
      "time": "0.05s",
      "phase": "REQUEST_RECEIVED",
      "what_happened": "📋 Configuration loaded. Using hybrid (semantic + keyword) search mode with 8 results per method."
    },
    {
      "step": 3,
      "time": "0.12s",
      "phase": "QUERY_CLASSIFICATION",
      "what_happened": "🔍 Analyzed your question and identified it as: herb_properties. This will search 3 specialized knowledge bases."
    }
    // ... more steps
  ],
  
  "technicalLog": [
    // Full technical details for developers
  ]
}
```

## Log Sections

### 1. Summary
Quick overview at the top:
- Original query text
- Sanitized title for filename
- Total processing steps
- Total time in seconds
- Outcome (SUCCESS/ERROR)

### 2. Narrative
**Human-readable step-by-step explanation:**

Each step includes:
- **step**: Sequential number
- **time**: Elapsed time since query start
- **phase**: Technical phase name
- **what_happened**: Plain English description with emojis

#### Narrative Examples

**Query Classification:**
```
"🔍 Analyzed your question and identified it as: herb_properties, remedies. 
This will search 3 specialized knowledge bases."
```

**Search Completed:**
```
"✅ Search completed in 1.80s. Found 8 documents via semantic search 
(best score: 0.87) and 12 via keyword matching (best score: 0.78)."
```

**Hybrid Scoring:**
```
"⚖️ Combined results using 70% semantic + 30% keyword weighting. 
Found 20 total matches, removed 5 duplicates, keeping 15 unique documents."
```

**Context Preparation:**
```
"📚 Prepared context from top 8 documents (12,456 characters total, 
avg. relevance: 0.852) for AI response generation."
```

### 3. Technical Log
Full technical details preserved for developers, including:
- Raw data structures
- Scores and metrics
- Configuration parameters
- Timing information

## Initialization Log

Created when the Hybrid RAG system first loads. Shows system readiness and configuration.

### Example Init Log

```json
{
  "summary": {
    "event": "HYBRID_RAG_INITIALIZATION",
    "timestamp": "2024-01-15T10:00:00.000Z",
    "status": "READY"
  },
  
  "narrative": [
    {
      "step": 1,
      "what_happened": "✅ Hybrid RAG system successfully initialized with Pinecone vector database connection"
    },
    {
      "step": 2,
      "what_happened": "📚 Loaded 3 local knowledge bases: ayurcheck_rag.json, ayu_skinDiseases_rag.json, ayu_mentalDisorders_rag.json"
    },
    {
      "step": 3,
      "what_happened": "🔗 Connected to Pinecone index: \"ayurveda-knowledge\" with embedding model: text-embedding-3-small"
    },
    {
      "step": 4,
      "what_happened": "⚙️ Hybrid search configured with 70% semantic weight and 30% keyword weight"
    },
    {
      "step": 5,
      "what_happened": "🎯 Query classification, expansion, and namespace targeting features enabled"
    },
    {
      "step": 6,
      "what_happened": "✨ System ready to process Ayurvedic medicine queries with advanced RAG pipeline"
    }
  ],
  
  "technicalDetails": {
    // Full configuration details
  }
}
```

## Query Processing Phases

### Phase 1: INITIALIZATION
**What it means:** Logger setup with query information
**Example:** "🚀 Started processing your question: 'What herbs help with anxiety?'"

### Phase 2: REQUEST_RECEIVED
**What it means:** Configuration loaded, search mode determined
**Example:** "📋 Configuration loaded. Using hybrid (semantic + keyword) search mode with 8 results per method."

### Phase 3: QUERY_CLASSIFICATION
**What it means:** AI analyzed the question to understand intent
**Example:** "🔍 Analyzed your question and identified it as: herb_properties, mental_health. This will search 3 specialized knowledge bases."

### Phase 4: NAMESPACE_TARGETING
**What it means:** System determined which knowledge bases to search
**Example:** "🎯 Targeting specific knowledge bases: ayurcheck_rag.json, ayu_mentalDisorders_rag.json. This focused search saves 40% in processing costs."

### Phase 5: QUERY_EXPANSION
**What it means:** Generated alternative phrasings to improve search coverage
**Example:** "📝 Generated 3 variations of your question to improve search coverage. Original: 'What herbs help with anxiety?'"

### Phase 6: SEARCH_INITIATION
**What it means:** Starting parallel vector and keyword searches
**Example:** "🔎 Starting parallel search: Vector search (8 results) + BM25 keyword search (15 results)"

### Phase 7: SEARCH_COMPLETED
**What it means:** Both searches finished, results retrieved
**Example:** "✅ Search completed in 1.80s. Found 8 documents via semantic search (best score: 0.87) and 12 via keyword matching (best score: 0.78)."

### Phase 8: HYBRID_SCORING
**What it means:** Combining vector and keyword results with weighted scoring
**Example:** "⚖️ Combined results using 70% semantic + 30% keyword weighting. Found 20 total matches, removed 5 duplicates, keeping 15 unique documents."

### Phase 9: RELEVANCE_FILTERING
**What it means:** Removing low-quality matches below threshold
**Example:** "🔬 Applied relevance filter (threshold: 0.5). Removed 2 low-quality matches, keeping 13 highly relevant documents."

### Phase 10: CONTEXT_PREPARATION
**What it means:** Formatting top results as context for AI
**Example:** "📚 Prepared context from top 8 documents (12,456 characters total, avg. relevance: 0.852) for AI response generation."

### Phase 11: LLM_GENERATION_START
**What it means:** Sending context to OpenAI to generate answer
**Example:** "🤖 Generating response using gpt-4 (temperature: 0.3). This creates a natural, context-aware answer based on the retrieved Ayurvedic knowledge."

### Phase 12: RESPONSE_STREAMING
**What it means:** Answer generated and streamed to user
**Example:** "✨ Response completed successfully! Total processing time: 3.45s"

### ERROR Phase
**What it means:** Something went wrong during processing
**Example:** "❌ Error occurred: Failed to connect to Pinecone: Network timeout"

## How to Read Logs

### For Non-Technical Users

1. **Open the log file** in any text editor
2. **Read the "summary" section** for quick overview
3. **Read the "narrative" array** step-by-step
4. Each "what_happened" field explains what the system did in plain English
5. Check the "outcome" field - should be "SUCCESS"

### For Developers

1. Start with the "summary" for overview
2. Use "narrative" to understand the flow
3. Dive into "technicalLog" for debugging
4. Check timing ("elapsedSeconds") to identify bottlenecks
5. Review "technicalDetails" for exact configurations and scores

## Example Use Cases

### Use Case 1: Understanding Query Results
**Question:** "Why did the system recommend these specific herbs?"

**Answer:** Look at the narrative:
- Step 3 shows how query was classified
- Step 4 shows which knowledge bases were searched
- Step 8 shows how results were scored
- Step 10 shows which documents were used as context

### Use Case 2: Performance Analysis
**Question:** "Which step takes the most time?"

**Answer:** Compare "time" field in narrative:
```
Step 7: "time": "1.80s" → Search took longest
Step 11: "time": "3.20s" → LLM generation took 1.4s
```

### Use Case 3: Quality Assessment
**Question:** "How confident is the system in these results?"

**Answer:** Look at narrative:
- Step 7: "best score: 0.87" → Very high relevance
- Step 10: "avg. relevance: 0.852" → Consistently high quality
- Scores range 0-1, with 0.8+ being excellent

### Use Case 4: Troubleshooting Errors
**Question:** "Why did my query fail?"

**Answer:** Check:
1. Summary "outcome" field
2. Last step in narrative before ERROR
3. ERROR phase "what_happened" for explanation
4. Technical log for stack trace

## Console Output

The system also logs to console in real-time:

```
[1] INITIALIZATION (0ms):
🚀 Started processing your question: "What are the benefits of Ashwagandha?"

[2] REQUEST_RECEIVED (52ms):
📋 Configuration loaded. Using hybrid (semantic + keyword) search mode with 8 results per method.

[3] QUERY_CLASSIFICATION (124ms):
🔍 Analyzed your question and identified it as: herb_properties. This will search 3 specialized knowledge bases.

...

✅ Debug log saved: logs/hybrid-rag-queries/2024-01-15_103045_what-are-the-benefits-of-ashwagandha.json
```

## Benefits of Human-Friendly Logs

1. **Transparency**: Understand exactly what the system did
2. **Quality Control**: Verify the system made correct decisions
3. **Performance Monitoring**: Identify slow steps
4. **Debugging**: Quickly identify where errors occurred
5. **Documentation**: Natural language explanations
6. **Stakeholder Communication**: Share with non-technical team members
7. **System Auditing**: Review past queries and decisions

## Log Retention

- Logs are stored indefinitely in `logs/hybrid-rag-queries/`
- Add to `.gitignore` to avoid version control
- Consider rotating logs periodically (e.g., archive after 30 days)
- Each query creates a new file (no overwriting)

## Privacy Considerations

Logs contain:
- ✅ User queries (full text)
- ✅ System responses (context used)
- ✅ Retrieval scores and rankings
- ❌ No user identification
- ❌ No authentication tokens

**Recommendation:** Treat logs as sensitive data if queries contain personal health information.

## Next Steps

1. **Test the logging** by making a query through the UI
2. **Find your log file** in `logs/hybrid-rag-queries/`
3. **Read the narrative section** to see human-friendly explanations
4. **Review the initialization log** (`*_init.json`) to verify system status
5. **Use logs for quality assurance** and system monitoring

## Example: Complete Query Log

See the actual format by running a query and checking:
```
logs/hybrid-rag-queries/2024-01-15_103045_what-are-the-benefits-of-ashwagandha.json
```

The narrative section will tell you exactly what happened in plain English! 🎉
