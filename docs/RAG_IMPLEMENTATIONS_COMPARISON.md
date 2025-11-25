# RAG Implementation Comparison & Test Mapping

## Overview of RAG Implementations

We have **TWO DISTINCT RAG implementations** in this project with very different architectures:

### 1. Local JSON-Based RAG (`/api/ayurveda-enhanced`)
**Location:** `src/app/api/ayurveda-enhanced/route.ts`

**Architecture:**
- ✗ No vector database
- ✓ Local JSON file loading (`ayurcheck_rag.json`, `ayu_skinDiseases_rag.json`, `ayu_mentalDisorders_rag.json`)
- ✓ Keyword-based search (TF-IDF approximation)
- ✓ Query classification and expansion
- ✓ Hybrid scoring (semantic + keyword)
- ✓ Multi-dataset support (3 datasets)

**Key Features:**
```typescript
- Query classification to route to appropriate datasets
- Keyword matching with stemming
- Query expansion for better recall
- Relevance filtering
- Context formatting with metadata
```

**Pros:**
- Fast startup (no vector DB connection)
- No external dependencies
- Works offline
- Simple deployment

**Cons:**
- Limited semantic understanding
- Keyword-only matching
- Doesn't scale well to large datasets
- No true vector similarity

---

### 2. Pinecone Vector Database RAG (`/api/embedpinecone`)
**Location:** `src/app/api/embedpinecone/route.ts`

**Architecture:**
- ✓ Pinecone cloud vector database
- ✓ OpenAI embeddings (`text-embedding-3-small`)
- ✓ True semantic similarity search
- ✓ Multi-namespace architecture (5 namespaces)
- ✓ Automatic data loading from JSONL
- ✓ Citation generation with metadata

**Key Features:**
```typescript
- Vector embeddings for semantic search
- Multi-namespace querying:
  * default (pharmacopoeia)
  * skin-diseases
  * skin-diseases-tables
  * mental-disorders
  * mental-disorders-tables
- Parallel namespace search
- Score-based ranking
- Rich metadata preservation
- Citation formatting
```

**Pros:**
- True semantic understanding
- Finds conceptually similar content
- Scales to millions of vectors
- Multi-namespace architecture
- Production-ready

**Cons:**
- Requires Pinecone account
- External API dependency
- Slower first request (cold start)
- Costs scale with usage

---

## Test File Mapping

### Current Situation (INCORRECT)

| Test File | Intended Target | Actual Target | Issue |
|-----------|----------------|---------------|-------|
| `test-enhanced-rag.js` | Should test Pinecone | Tests `/api/ayurveda-enhanced` | ❌ Testing wrong endpoint |

### Corrected Mapping (NEW)

| Test File | Target Endpoint | Purpose |
|-----------|----------------|---------|
| `test-enhanced-rag.js` | `/api/ayurveda-enhanced` | Test local JSON keyword-based RAG |
| `test-pinecone-rag.js` | `/api/embedpinecone` | **Test Pinecone vector database RAG** ⭐ |

---

## What Each Test Validates

### `test-enhanced-rag.js` (Local JSON RAG)
Tests keyword-based retrieval:
- ✓ Multi-dataset loading
- ✓ Query classification
- ✓ Keyword matching
- ✓ Query expansion
- ✓ Relevance filtering
- ✗ NO vector embeddings
- ✗ NO Pinecone

### `test-pinecone-rag.js` (Vector Database RAG) ⭐ NEW
Tests true hybrid RAG:
- ✓ Pinecone health check
- ✓ Vector similarity search
- ✓ Multi-namespace queries
- ✓ Semantic understanding
- ✓ Citation generation
- ✓ Response headers validation
- ✓ Embedding-based retrieval

---

## Running the Tests

### Test Local JSON RAG
```bash
# Make sure dev server is running
npm run dev

# In another terminal
node examples/test-enhanced-rag.js
```

**Expected behavior:**
- Fast responses
- Keyword matching
- No "X-Vector-DB" header
- No Pinecone references

---

### Test Pinecone Vector RAG ⭐
```bash
# 1. Ensure Pinecone credentials are set
# Add to .env.local:
PINECONE_API_KEY=your_key_here
PINECONE_INDEX_NAME=ayurveda-knowledge
PINECONE_ENVIRONMENT=us-east-1-aws

# 2. Start dev server
npm run dev

# 3. Run Pinecone-specific tests
node examples/test-pinecone-rag.js
```

**Expected behavior:**
- Health check shows Pinecone status
- Vector count displayed
- Response headers include:
  - `X-Vector-DB: Pinecone`
  - `X-Documents-Found: <count>`
  - `X-Index-Name: ayurveda-knowledge`
- Citations in format: 【Ayurvedic Pharmacopoeia Vol-1†Herb†Page X】
- Semantic similarity matching (not just keywords)

---

## Key Differences in Query Processing

### Local JSON RAG (ayurveda-enhanced)
```
User Query
    ↓
Query Classification (detect topic)
    ↓
Query Expansion (generate variants)
    ↓
Keyword Search across datasets
    ↓
TF-IDF scoring
    ↓
Hybrid re-ranking
    ↓
Relevance filtering
    ↓
Response generation
```

### Pinecone Vector RAG (embedpinecone)
```
User Query
    ↓
Generate Query Embedding (OpenAI)
    ↓
Search 5 Namespaces in Parallel (Pinecone)
    ↓
Vector Similarity Scoring
    ↓
Merge & Sort Results
    ↓
Filter by Relevance Threshold
    ↓
Format with Citations
    ↓
Response Generation (GPT-4o-mini)
```

---

## Migration Path

To enhance the **`embedpinecone`** endpoint with advanced features from **`ayurveda-enhanced`**:

### Features to Add:
1. **Query Classification** - Route to specific namespaces intelligently
2. **Query Expansion** - Generate query variations for better recall
3. **Hybrid Search** - Combine vector similarity + keyword matching
4. **Re-ranking** - Apply secondary scoring after retrieval
5. **Confidence Scoring** - Filter low-confidence results

### Implementation Strategy:
```typescript
// In embedpinecone/route.ts

// 1. Add query classifier (from ayurveda-enhanced)
const namespaces = QueryClassifier.getRecommendedNamespaces(query);

// 2. Add query expansion
const expandedQueries = QueryExpander.expandQuery(query);

// 3. Search with expanded queries
for (const expandedQuery of expandedQueries) {
  const embedding = await embeddings.embedQuery(expandedQuery);
  const results = await index.query({ vector: embedding });
  allResults.push(...results);
}

// 4. Apply hybrid re-ranking
const reranked = HybridSearch.rerank(query, allResults);

// 5. Filter by confidence
const filtered = RelevanceFilter.filter(reranked, threshold);
```

---

## Recommended Next Steps

1. ✅ **Run both tests** to understand behavior differences
2. ✅ **Keep both implementations** - they serve different use cases
3. 🔄 **Enhance Pinecone RAG** with features from local RAG:
   - Add query classification to route namespaces
   - Add query expansion for better recall
   - Add hybrid scoring (vector + keyword)
   - Add confidence filtering
4. 📊 **Compare results** side-by-side for same queries
5. 🎯 **Choose deployment** based on requirements:
   - **Local RAG**: Prototyping, offline, cost-sensitive
   - **Pinecone RAG**: Production, scale, semantic search

---

## Testing Checklist

### Local JSON RAG (`test-enhanced-rag.js`)
- [ ] Health check returns dataset info
- [ ] Multi-dataset queries work
- [ ] Query classification routes correctly
- [ ] Responses contain relevant content
- [ ] No Pinecone references

### Pinecone Vector RAG (`test-pinecone-rag.js`)
- [ ] Health check shows Pinecone status
- [ ] Vector count > 0
- [ ] Multi-namespace search works
- [ ] Response headers include Pinecone info
- [ ] Citations properly formatted
- [ ] Semantic similarity evident
- [ ] Response time acceptable

---

## Conclusion

**The confusion arose because:**
1. The `ayurveda-enhanced` endpoint was labeled "enhanced" but doesn't use vectors
2. The `embedpinecone` endpoint is the TRUE hybrid RAG with embeddings
3. The test file was testing the wrong endpoint

**Now we have:**
- ✅ Correct test for Pinecone RAG (`test-pinecone-rag.js`)
- ✅ Clear documentation of differences
- ✅ Migration path for enhancing Pinecone with advanced features
- ✅ Both implementations preserved for different use cases
